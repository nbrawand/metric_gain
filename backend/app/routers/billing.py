"""Billing endpoints. Stripe subscription management."""

import json
import logging
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.utils.auth import get_current_user
from app.utils.ratelimit import limiter

logger = logging.getLogger(__name__)

router = APIRouter()


def _id_of(value):
    """Stripe fields are either an id string or an expanded object."""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return value.get("id")
    return None


def _invoice_subscription_id(invoice) -> Optional[str]:
    """Pull the subscription id out of an invoice across Stripe API versions.

    Recent versions moved it from `invoice.subscription` to
    `invoice.parent.subscription_details.subscription`.
    """
    subscription_id = _id_of(invoice.get("subscription"))
    if subscription_id:
        return subscription_id

    parent = invoice.get("parent") or {}
    details = parent.get("subscription_details") or {}
    subscription_id = _id_of(details.get("subscription"))
    if subscription_id:
        return subscription_id

    for line in (invoice.get("lines") or {}).get("data") or []:
        line_parent = (line.get("parent") or {}).get("subscription_item_details") or {}
        subscription_id = _id_of(line_parent.get("subscription")) or _id_of(line.get("subscription"))
        if subscription_id:
            return subscription_id
    return None


def _find_user_by_subscription(db: Session, subscription_id: Optional[str]):
    """Look up the subscriber, never matching on a missing id."""
    if not subscription_id:
        return None
    return db.query(User).filter(
        User.stripe_subscription_id == subscription_id
    ).first()


def _stale_event(user: User, event) -> bool:
    """True when this event was already applied, or is older than the last one.

    Stripe neither orders deliveries nor stops retrying for days, so both
    cases really happen: the same event redelivered after it was processed,
    and an old past_due arriving after the active that superseded it. Events
    stamped the same second as the last applied one are let through, their
    order is unknowable, and dropping them risks discarding a genuinely newer
    state.
    """
    if user.stripe_event_id == event["id"]:
        return True
    if user.stripe_event_created is not None and event["created"] < user.stripe_event_created:
        return True
    return False


def _mark_event_applied(user: User, event) -> None:
    user.stripe_event_id = event["id"]
    user.stripe_event_created = event["created"]

stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/create-checkout-session")
@limiter.limit("10/minute")
async def create_checkout_session(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Stripe Checkout session for subscription."""
    # State guards come before the config check so the endpoint answers the same
    # way whatever the deployment holds, "you already have a subscription" is
    # true regardless of whether Stripe keys happen to be loaded.
    # Checking out again would open a second subscription and orphan the first,
    # which keeps billing with no user attached to its webhooks
    if current_user.subscription_status == "active":
        raise HTTPException(
            status_code=400, detail="You already have an active subscription."
        )
    # past_due is the same trap: the subscription still exists and only needs a
    # working card, so this user belongs in the billing portal, not in checkout
    if current_user.subscription_status == "past_due":
        raise HTTPException(
            status_code=400,
            detail=(
                "Your subscription is still open, its last payment failed. "
                "Use Manage Subscription to update your card."
            ),
        )

    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=501, detail="Payments are not configured.")

    # The local status only moves when a webhook lands, so in the window
    # between completing checkout and the webhook arriving the guards above
    # pass and a second checkout would open a second live subscription. Ask
    # Stripe directly whether one is already open. Only statuses the app
    # treats as open block here, unpaid/canceled map to a closed local
    # subscription and must stay eligible for a fresh checkout.
    if current_user.stripe_customer_id:
        existing = stripe.Subscription.list(
            customer=current_user.stripe_customer_id, status="all", limit=100
        )
        if any(s.status in ("active", "trialing", "past_due", "incomplete") for s in existing.data):
            raise HTTPException(
                status_code=400,
                detail=(
                    "You already have a subscription in progress. "
                    "Use Manage Subscription if it needs attention."
                ),
            )

    # Create Stripe Customer if none exists
    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.full_name or "",
            metadata={"user_id": str(current_user.id)},
        )
        current_user.stripe_customer_id = customer.id
        db.commit()

    checkout_session = stripe.checkout.Session.create(
        customer=current_user.stripe_customer_id,
        mode="subscription",
        line_items=[{"price": settings.STRIPE_PRICE_ID, "quantity": 1}],
        success_url=f"{settings.FRONTEND_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/billing/cancel",
    )

    return {"url": checkout_session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events."""
    # An empty secret must refuse service, not verify: construct_event happily
    # validates an HMAC computed with an empty key, so without this guard a
    # deploy that forgot STRIPE_WEBHOOK_SECRET accepts self-signed events from
    # anyone, free subscription activations, forced cancellations.
    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not configured")
        raise HTTPException(status_code=503, detail="Billing webhooks are not configured.")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Verify with the SDK, then read the fields off the raw JSON rather than
    # off the object it returns. The SDK's own object model is not stable
    # across major versions: StripeObject subclassed dict until 15.0.0 and
    # stopped, which turned every .get() below into an AttributeError and 500d
    # the whole handler. The payload itself is just JSON and always has been.
    # construct_event already parsed it to verify, so this cannot fail here.
    event = json.loads(payload)
    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        customer_id = _id_of(data.get("customer")) or data.get("customer")
        subscription_id = _id_of(data.get("subscription"))
        # Never look a user up by a missing id: `column == None` compiles to
        # IS NULL and would match an arbitrary user who has no id stored
        user = (
            db.query(User).filter(User.stripe_customer_id == customer_id).first()
            if customer_id
            else None
        )
        # Fallback: look up by email from checkout session
        if not user:
            customer_email = (data.get("customer_details") or {}).get("email")
            logger.warning("No user found for stripe_customer_id=%s, trying email=%s", customer_id, customer_email)
            if customer_email:
                user = db.query(User).filter(User.email == customer_email).first()
                if user:
                    user.stripe_customer_id = customer_id
        if user and _stale_event(user, event):
            logger.info("Skipping stale/duplicate event %s for user=%s", event["id"], user.email)
        elif user:
            # Never overwrite a stored subscription id with nothing, losing
            # it means later cancellation events can't find this user and
            # their access would never end.
            if subscription_id:
                user.stripe_subscription_id = subscription_id
            # Delayed-notification methods (ACH and friends) complete the
            # session before the money moves. Record the ids either way so the
            # later subscription events can find the user, but only paid
            # sessions grant access, the subscription.updated that follows
            # the eventual payment flips the status.
            payment_status = data.get("payment_status")
            if payment_status in (None, "paid", "no_payment_required"):
                user.subscription_status = "active"
                logger.info("Activated subscription for user=%s", user.email)
            else:
                logger.info(
                    "Checkout completed with payment_status=%s for user=%s; awaiting payment",
                    payment_status, user.email,
                )
            _mark_event_applied(user, event)
            db.commit()
        else:
            logger.error("Webhook checkout.session.completed: no user found for customer=%s", customer_id)

    elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        subscription_id = data.get("id")
        stripe_status = data.get("status")
        user = _find_user_by_subscription(db, subscription_id)
        if user and _stale_event(user, event):
            logger.info("Skipping stale/duplicate event %s for user=%s", event["id"], user.email)
        elif user:
            status_map = {
                "active": "active",
                "trialing": "trialing",
                "past_due": "past_due",
                "canceled": "canceled",
                "unpaid": "canceled",
                "incomplete_expired": "canceled",
            }
            mapped = status_map.get(stripe_status)
            if mapped is None:
                # Statuses like paused/incomplete are not a cancellation;
                # downgrading on them would lock a paying customer out
                logger.warning(
                    "Unhandled stripe subscription status=%s for subscription=%s",
                    stripe_status, subscription_id,
                )
            else:
                user.subscription_status = mapped
                _mark_event_applied(user, event)
                db.commit()
        else:
            logger.error("Webhook %s: no user for subscription=%s", event_type, subscription_id)

    elif event_type == "invoice.payment_failed":
        subscription_id = _invoice_subscription_id(data)
        user = _find_user_by_subscription(db, subscription_id)
        # Fall back to the customer only when the invoice names no
        # subscription at all. An invoice for a subscription this app doesn't
        # track is a retry from one the user already replaced, marking them
        # past_due for it locks out an account whose current subscription is
        # healthy, with no event that would ever undo it.
        if not user and not subscription_id:
            customer_id = _id_of(data.get("customer"))
            if customer_id:
                user = db.query(User).filter(
                    User.stripe_customer_id == customer_id
                ).first()
        if user and _stale_event(user, event):
            logger.info("Skipping stale/duplicate event %s for user=%s", event["id"], user.email)
        elif user:
            user.subscription_status = "past_due"
            _mark_event_applied(user, event)
            db.commit()
        else:
            logger.error(
                "Webhook invoice.payment_failed: no user for subscription=%s customer=%s",
                subscription_id, data.get("customer"),
            )

    return {"status": "ok"}


@router.post("/create-portal-session")
@limiter.limit("10/minute")
async def create_portal_session(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Customer Portal session for subscription management."""
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="You don't have a subscription to manage yet.")
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=501, detail="Payments are not configured.")

    portal_session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/",
    )

    return {"url": portal_session.url}
