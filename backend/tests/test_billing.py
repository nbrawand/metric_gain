"""Tests for the billing endpoints' guards.

Stripe itself is never called here: every case below is rejected before the
handler reaches the Stripe SDK, which is what makes them testable without keys.
"""

import pytest
from fastapi import status

from app.models.user import User
from tests.conftest import TestingSessionLocal


@pytest.fixture
def billing_user(make_auth_headers):
    """A user whose subscription status the test can move around."""
    headers = make_auth_headers("billing_test@example.com", "Billing Tester")

    def set_status(new_status):
        db = TestingSessionLocal()
        try:
            user = db.query(User).filter(User.email == "billing_test@example.com").first()
            user.subscription_status = new_status
            db.commit()
        finally:
            db.close()

    return headers, set_status


def test_checkout_is_refused_while_a_subscription_is_still_open(client, billing_user):
    """active and past_due both already have a subscription in Stripe.

    Letting past_due check out opened a second subscription alongside the one
    whose card had failed, and past_due is exactly the state that locks the
    app and drops the user on the subscribe page with nowhere else to go.
    """
    headers, set_status = billing_user

    for open_status in ("active", "past_due"):
        set_status(open_status)
        response = client.post("/v1/billing/create-checkout-session", headers=headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST, open_status

    # A cancelled subscription is genuinely gone, so checking out again is the
    # right move; it gets as far as Stripe, which is unconfigured under test.
    set_status("canceled")
    assert client.post(
        "/v1/billing/create-checkout-session", headers=headers
    ).status_code == status.HTTP_501_NOT_IMPLEMENTED


def test_portal_is_refused_without_a_stripe_customer(client, billing_user):
    """Nothing to manage until the user has actually checked out once."""
    headers, set_status = billing_user
    set_status("active")

    response = client.post("/v1/billing/create-portal-session", headers=headers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_billing_endpoints_require_auth(client):
    for path in ("create-checkout-session", "create-portal-session"):
        assert client.post(f"/v1/billing/{path}").status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )


def test_webhook_refuses_service_without_a_secret(client):
    """An empty webhook secret must refuse service, not verify.

    stripe's construct_event happily validates an HMAC computed with an empty
    key, so accepting requests here would let anyone forge subscription events.
    """
    response = client.post(
        "/v1/billing/webhook",
        content=b"{}",
        headers={"stripe-signature": "t=1,v1=deadbeef"},
    )
    assert response.status_code == 503


# --- Webhook event handling ---
#
# These tests sign real payloads: construct_event verifies an HMAC over
# "{timestamp}.{payload}", so a test secret plus hmac is all Stripe needs.

import hashlib
import hmac
import json
import time

TEST_WEBHOOK_SECRET = "whsec_test_secret"


@pytest.fixture
def webhook_secret(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", TEST_WEBHOOK_SECRET)
    return TEST_WEBHOOK_SECRET


def _post_event(client, event: dict):
    payload = json.dumps(event).encode()
    ts = int(time.time())
    mac = hmac.new(
        TEST_WEBHOOK_SECRET.encode(), f"{ts}.".encode() + payload, hashlib.sha256
    ).hexdigest()
    return client.post(
        "/v1/billing/webhook",
        content=payload,
        headers={"stripe-signature": f"t={ts},v1={mac}"},
    )


def _billing_user_row(mutate=None):
    """Read (and optionally mutate) the billing test user directly."""
    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.email == "billing_test@example.com").first()
        if mutate:
            mutate(user)
            db.commit()
            db.refresh(user)
        db.expunge(user)
        return user
    finally:
        db.close()


def _subscription_event(event_id, created, sub_status):
    return {
        "id": event_id,
        "object": "event",
        "type": "customer.subscription.updated",
        "created": created,
        "data": {"object": {"id": "sub_test_1", "object": "subscription", "status": sub_status}},
    }


def test_webhook_drops_stale_and_duplicate_events(client, billing_user, webhook_secret):
    """Stripe retries events for days and does not guarantee order.

    A past_due emitted before the active that superseded it must not win just
    because it arrived last, that locked the user out of the app and out of
    checkout with a healthy subscription, and nothing would ever undo it.
    """
    headers, set_status = billing_user
    set_status("past_due")
    _billing_user_row(lambda u: setattr(u, "stripe_subscription_id", "sub_test_1"))

    # The newer event applies
    assert _post_event(client, _subscription_event("evt_new", 2_000, "active")).status_code == 200
    assert _billing_user_row().subscription_status == "active"

    # An older event delivered late is dropped
    assert _post_event(client, _subscription_event("evt_old", 1_000, "past_due")).status_code == 200
    assert _billing_user_row().subscription_status == "active"

    # A retry of the already-applied event is a no-op even at the same timestamp
    assert _post_event(client, _subscription_event("evt_new", 2_000, "past_due")).status_code == 200
    assert _billing_user_row().subscription_status == "active"

    # A genuinely newer event still gets through
    assert _post_event(client, _subscription_event("evt_newer", 3_000, "canceled")).status_code == 200
    assert _billing_user_row().subscription_status == "canceled"


def test_checkout_completion_without_payment_does_not_activate(client, billing_user, webhook_secret):
    """Delayed-notification methods complete the session before the money moves.

    The subscription id must still be recorded, the later subscription events
    are what activate the account, and they look the user up by that id.
    """
    headers, set_status = billing_user
    set_status("trialing")
    _billing_user_row(lambda u: setattr(u, "stripe_customer_id", "cus_test_1"))

    event = {
        "id": "evt_checkout_unpaid",
        "object": "event",
        "type": "checkout.session.completed",
        "created": 1_000,
        "data": {"object": {
            "object": "checkout.session",
            "customer": "cus_test_1",
            "subscription": "sub_test_9",
            "payment_status": "unpaid",
        }},
    }
    assert _post_event(client, event).status_code == 200

    user = _billing_user_row()
    assert user.subscription_status == "trialing"
    assert user.stripe_subscription_id == "sub_test_9"


def test_webhook_does_not_depend_on_the_sdk_object_model(
    client, billing_user, webhook_secret, monkeypatch
):
    """Field access must survive a stripe SDK that returns a non-dict.

    StripeObject subclassed dict until stripe 15.0.0 and then stopped, which
    turned every `.get()` in the handler into an AttributeError and 500d the
    whole webhook. The handler reads the verified JSON payload instead, so this
    stands in for the SDK version CI does not install: construct_event returns
    something with no mapping interface at all, and the event still applies.
    """
    headers, set_status = billing_user
    set_status("past_due")
    _billing_user_row(lambda u: setattr(u, "stripe_subscription_id", "sub_test_1"))

    class NotADict:
        """What construct_event returns in stripe 15, near enough."""

        def __getattr__(self, name):
            raise AttributeError(name)

    monkeypatch.setattr(
        "app.routers.billing.stripe.Webhook.construct_event",
        lambda payload, sig, secret: NotADict(),
    )

    assert _post_event(client, _subscription_event("evt_sdk", 3_000, "active")).status_code == 200
    assert _billing_user_row().subscription_status == "active"
