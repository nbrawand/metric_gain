"""Billing endpoints — Stripe subscription management."""

import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/create-checkout-session")
async def create_checkout_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Stripe Checkout session for subscription."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=501, detail="Stripe not configured")

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
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.stripe_subscription_id = subscription_id
            user.subscription_status = "active"
            db.commit()

    elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        subscription_id = data.get("id")
        stripe_status = data.get("status")
        user = db.query(User).filter(
            User.stripe_subscription_id == subscription_id
        ).first()
        if user:
            status_map = {
                "active": "active",
                "past_due": "past_due",
                "canceled": "canceled",
                "unpaid": "canceled",
                "incomplete_expired": "canceled",
            }
            user.subscription_status = status_map.get(stripe_status, "canceled")
            db.commit()

    elif event_type == "invoice.payment_failed":
        subscription_id = data.get("subscription")
        user = db.query(User).filter(
            User.stripe_subscription_id == subscription_id
        ).first()
        if user:
            user.subscription_status = "past_due"
            db.commit()

    return {"status": "ok"}


@router.post("/create-portal-session")
async def create_portal_session(
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Customer Portal session for subscription management."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=501, detail="Stripe not configured")
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")

    portal_session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/profile",
    )

    return {"url": portal_session.url}


@router.get("/status")
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
):
    """Return current subscription status."""
    return {
        "subscription_status": current_user.subscription_status,
        "trial_ends_at": current_user.trial_ends_at.isoformat() if current_user.trial_ends_at else None,
        "has_subscription": current_user.stripe_subscription_id is not None,
    }
