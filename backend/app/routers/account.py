"""Self-service data export and account deletion.

Mounted without the subscription guard, deliberately. Someone whose
subscription has lapsed is exactly the person most likely to want their data
out or their account gone, and a paywall in front of either would make the
privacy policy false.
"""

import json
import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services.account import delete_account, export_account
from app.utils.auth import get_current_user
from app.utils.ratelimit import limiter

logger = logging.getLogger(__name__)

router = APIRouter()


class DeleteAccountRequest(BaseModel):
    """Deletion is irreversible, so it takes more than a click to reach."""

    confirm_email: str


def _close_billing(user: User) -> None:
    """Delete the Stripe customer, which cancels any subscription with it.

    Raises on failure so the caller can abandon the deletion. Leaving the
    account in place is the kinder failure: the alternative is deleting the
    only record that ties this person to a Stripe customer while their card is
    still on file and still being charged every month, with nothing left in
    our database to trace it back from.
    """
    if not user.stripe_customer_id or not settings.STRIPE_SECRET_KEY:
        return

    try:
        stripe.Customer.delete(user.stripe_customer_id)
    except stripe.InvalidRequestError as exc:
        # Already gone at Stripe's end is the state we wanted, not an error
        if "No such customer" in str(exc):
            logger.info(
                "Stripe customer %s was already deleted", user.stripe_customer_id
            )
            return
        raise


@router.get("/export")
@limiter.limit("5/minute")
async def export_my_data(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Every row we hold about this account, as a JSON file.

    Served as a download rather than a plain response so that following the
    link produces a file the user can keep, which is the point of the right.
    """
    payload = export_account(db, current_user)
    body = json.dumps(payload, indent=2, default=str)
    filename = f"strength-guider-export-{current_user.id}.json"

    logger.info("Exported account data for user=%s", current_user.email)
    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
async def delete_my_account(
    request: Request,
    body: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete this account and everything attached to it. Irreversible.

    The typed email is a speed bump, not a security control: the token already
    proves who is asking. It exists so that a mis-aimed click cannot destroy
    someone's training history.
    """
    if body.confirm_email.strip().lower() != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Type the email address on your account to confirm.",
        )

    try:
        _close_billing(current_user)
    except Exception:
        # Deliberately broad: whatever went wrong at Stripe, the account still
        # has a live customer against it and must not be deleted yet
        logger.exception(
            "Refusing to delete user=%s, could not close Stripe customer %s",
            current_user.email,
            current_user.stripe_customer_id,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "We could not close your billing with our payment provider, so "
                "nothing has been deleted. Please try again shortly, or contact "
                "support and we will finish it by hand."
            ),
        )

    delete_account(db, current_user)
    return None
