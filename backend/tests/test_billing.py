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
    whose card had failed — and past_due is exactly the state that locks the
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
