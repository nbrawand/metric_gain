"""Admin endpoints — user and subscription management."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter()


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


class GrantTrialRequest(BaseModel):
    email: EmailStr
    days: int


class SetSubscriptionRequest(BaseModel):
    email: EmailStr
    status: str  # "active", "trialing", "canceled", "none"


class UserListItem(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    subscription_status: str
    trial_ends_at: Optional[str] = None
    is_admin: bool

    class Config:
        from_attributes = True


@router.post("/grant-trial")
async def grant_trial(
    body: GrantTrialRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Grant or extend a user's trial by N days."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    # Extend from current trial end if still in the future, otherwise from now
    base = user.trial_ends_at if user.trial_ends_at and user.trial_ends_at > now else now
    user.trial_ends_at = base + timedelta(days=body.days)
    user.subscription_status = "trialing"
    db.commit()

    return {
        "email": user.email,
        "trial_ends_at": user.trial_ends_at.isoformat(),
        "days_remaining": (user.trial_ends_at - now).days,
    }


@router.post("/set-subscription")
async def set_subscription(
    body: SetSubscriptionRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Manually set a user's subscription status."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    valid_statuses = ("active", "trialing", "canceled", "past_due", "none")
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid_statuses)}")

    user.subscription_status = body.status
    db.commit()

    return {"email": user.email, "subscription_status": user.subscription_status}


@router.get("/users")
async def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """List all users with subscription info."""
    users = db.query(User).order_by(User.id).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "subscription_status": u.subscription_status,
            "trial_ends_at": u.trial_ends_at.isoformat() if u.trial_ends_at else None,
            "is_admin": u.is_admin,
        }
        for u in users
    ]
