"""Admin endpoints, user and subscription management.

Every route here is additionally guarded at the mount point in main.py. The
per-endpoint dependency below is kept as well: a route that loses one still has
the other, and a new route added without either is still refused.
"""

import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin_audit import AdminAuditLog
from app.models.user import User
from app.utils.auth import as_utc, get_current_user
from app.utils.ratelimit import limiter

router = APIRouter()

# Generous for a human clicking through the user list, tight enough that a
# stolen admin token cannot bulk-rewrite the user base before anyone notices
ADMIN_RATE_LIMIT = "30/minute"


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


def _record(
    db: Session,
    actor: User,
    action: str,
    target: User,
    details: Optional[dict] = None,
) -> None:
    """Add an audit row for an admin action.

    Added to the session but not committed, the caller commits it in the same
    transaction as the change itself, so the log cannot end up describing a
    change that was rolled back, or miss one that went through.
    """
    db.add(
        AdminAuditLog(
            actor_user_id=actor.id,
            actor_email=actor.email,
            action=action,
            target_user_id=target.id,
            target_email=target.email,
            details=json.dumps(details) if details else None,
        )
    )


class GrantTrialRequest(BaseModel):
    email: EmailStr
    days: int = Field(..., ge=1, le=365)


class SetSubscriptionRequest(BaseModel):
    email: EmailStr
    status: str  # "active", "trialing", "canceled", "none"


class RevokeSessionsRequest(BaseModel):
    email: EmailStr


@router.post("/revoke-sessions")
@limiter.limit(ADMIN_RATE_LIMIT)
async def revoke_sessions(
    request: Request,
    body: RevokeSessionsRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Invalidate every token issued to a user.

    The lever to pull when an account is reported compromised. Without it the
    only options were to wait out the token lifetimes or deactivate the account
    outright, which also locks out the legitimate owner.
    """
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.token_version += 1
    _record(db, admin, "revoke_sessions", user)
    db.commit()

    return {"email": user.email, "sessions_revoked": True}


@router.post("/grant-trial")
@limiter.limit(ADMIN_RATE_LIMIT)
async def grant_trial(
    request: Request,
    body: GrantTrialRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Grant or extend a user's trial by N days."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.subscription_status == "active":
        # Flipping a paying customer to "trialing" leaves Stripe billing them
        # while hiding the button they would use to cancel, then locks them out
        # when the granted trial runs out
        raise HTTPException(
            status_code=400,
            detail="This user has an active paid subscription; cancel it before granting a trial.",
        )

    now = datetime.now(timezone.utc)
    # Extend from current trial end if still in the future, otherwise from now.
    # as_utc, because a naive value read back from the database raises on the
    # comparison instead of extending the trial.
    current_end = as_utc(user.trial_ends_at)
    base = current_end if current_end and current_end > now else now
    previous_status = user.subscription_status
    user.trial_ends_at = base + timedelta(days=body.days)
    user.subscription_status = "trialing"
    _record(
        db,
        admin,
        "grant_trial",
        user,
        {
            "days": body.days,
            "from_status": previous_status,
            "trial_ends_at": user.trial_ends_at.isoformat(),
        },
    )
    db.commit()

    # Committing expires the instance, so this reads back from the database.
    # Postgres returns it aware and SQLite returns it naive; as_utc is what
    # keeps the subtraction below from raising on one of them.
    new_end = as_utc(user.trial_ends_at)

    return {
        "email": user.email,
        "trial_ends_at": new_end.isoformat(),
        "days_remaining": (new_end - now).days,
    }


@router.post("/set-subscription")
@limiter.limit(ADMIN_RATE_LIMIT)
async def set_subscription(
    request: Request,
    body: SetSubscriptionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Manually set a user's subscription status."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    valid_statuses = ("active", "trialing", "canceled", "past_due", "none")
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid_statuses)}")

    previous_status = user.subscription_status
    user.subscription_status = body.status
    _record(
        db,
        admin,
        "set_subscription",
        user,
        {"from_status": previous_status, "to_status": body.status},
    )
    db.commit()

    return {"email": user.email, "subscription_status": user.subscription_status}


@router.get("/audit-log")
async def list_audit_log(
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    target_email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Read the admin action log, newest first.

    Without a way to read it the log would only be reachable by someone with
    direct database access, which is the situation it exists to avoid.
    """
    query = db.query(AdminAuditLog)
    if target_email:
        query = query.filter(AdminAuditLog.target_email == target_email)

    entries = (
        query.order_by(AdminAuditLog.created_at.desc(), AdminAuditLog.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": e.id,
            "actor_email": e.actor_email,
            "action": e.action,
            "target_email": e.target_email,
            "details": json.loads(e.details) if e.details else None,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


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
