"""Authentication endpoints. Google OAuth only."""

import logging

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import jwt
from google.auth.exceptions import GoogleAuthError
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserUpdate, UserResponse, AuthResponse
from app.utils.auth import (
    create_access_token,
    create_refresh_token,
    get_current_user,
)
from app.utils.db import apply_update, user_weight_unit
from app.utils.ratelimit import limiter
from app.services.progression import convert_weight

logger = logging.getLogger(__name__)

router = APIRouter()


class GoogleLoginBody(BaseModel):
    id_token: str


def _token_data(user: User) -> dict:
    """Claims every token for this user carries.

    `tv` pins the token to the user's current token_version so that signing out
    (or an admin revoking) can invalidate it, a plain JWT is otherwise good
    until it expires no matter what happens to the account.
    """
    return {"sub": str(user.id), "email": user.email, "tv": user.token_version}


@router.get("/google-client-id")
async def get_google_client_id():
    """Return the Google OAuth client ID for the frontend."""
    return {"client_id": settings.GOOGLE_CLIENT_ID}


@router.post("/google", response_model=AuthResponse)
@limiter.limit("20/minute")
async def google_login(
    request: Request, body: GoogleLoginBody, db: Session = Depends(get_db)
):
    """Authenticate via Google OAuth id_token. Creates account on first login."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google sign-in is not configured.")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            body.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Google sign-in failed. Please try again.")
    except GoogleAuthError:
        # Not a bad token. Google's cert endpoint couldn't be reached. A 401
        # here reads as "your login was rejected" when retrying would succeed.
        raise HTTPException(
            status_code=503,
            detail="Could not reach Google to verify your sign-in. Please try again.",
        )

    email = idinfo.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Your Google account did not share an email address.")

    # Accounts are matched purely on the email address, so an unverified one is
    # an account takeover: anyone who can get Google to mint a token carrying
    # someone else's address would land in that person's account.
    if not idinfo.get("email_verified"):
        raise HTTPException(
            status_code=401,
            detail="Your Google email address is not verified. Verify it with Google, then try again.",
        )

    name = idinfo.get("name", "")

    # Find or create user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=name,
            is_active=True,
            timezone="UTC",
            preferences="{}",
            subscription_status="trialing",
            trial_ends_at=datetime.now(timezone.utc) + timedelta(days=5),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Backfill trial for existing users who predate the subscription feature
    if user.subscription_status == "trialing" and user.trial_ends_at is None:
        user.trial_ends_at = datetime.now(timezone.utc) + timedelta(days=5)

    user.last_login = datetime.now(timezone.utc)
    db.commit()

    token_data = _token_data(user)
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return AuthResponse(
        user=UserResponse.from_orm(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh")
@limiter.limit("30/minute")
async def refresh_access_token(
    request: Request, body: RefreshRequest, db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.

    Args:
        request: Incoming request (used for rate limiting)
        body: JSON body containing refresh_token
        db: Database session

    Returns:
        New access token

    Raises:
        HTTPException: If refresh token is invalid
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Your session has expired. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(body.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            raise credentials_exception

        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception

        # Verify user still exists
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active:
            raise credentials_exception

        # A revoked refresh token must not be able to mint fresh access tokens
        if payload.get("tv", 0) != user.token_version:
            raise credentials_exception

        # Create new access token
        new_access_token = create_access_token(_token_data(user))

        return {"access_token": new_access_token, "token_type": "bearer"}

    except Exception:
        raise credentials_exception


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke every token issued to the caller.

    Signing out was previously client-side only: the browser dropped its copy
    while the tokens stayed valid for the rest of their lifetime, 90 minutes
    for an access token, 7 days for a refresh token. This makes the tokens
    themselves dead, which is what someone signing out on a shared or lost
    device is asking for. It signs the account out everywhere, on purpose.
    """
    current_user.token_version += 1
    db.commit()
    return None


@router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user's information.

    Args:
        current_user: Authenticated user from token

    Returns:
        User data
    """
    return UserResponse.from_orm(current_user)


def _convert_logged_weights(db: Session, user: User, from_unit: str, to_unit: str) -> int:
    """Rewrite every weight this user has logged into the new unit.

    Weights are stored as the number the lifter typed, so switching units
    without this would relabel a 225 lb squat as 225 kg, and every future
    target is computed from that history. Converted values land on a loadable
    step in the new unit rather than a decimal nobody can put on a bar.
    """
    from app.models.workout_session import WorkoutSession, WorkoutSet

    rows = (
        db.query(WorkoutSet)
        .join(WorkoutSession, WorkoutSession.id == WorkoutSet.workout_session_id)
        .filter(WorkoutSession.user_id == user.id)
        .all()
    )
    for workout_set in rows:
        if workout_set.weight:
            workout_set.weight = convert_weight(workout_set.weight, from_unit, to_unit)
        if workout_set.target_weight:
            workout_set.target_weight = convert_weight(
                workout_set.target_weight, from_unit, to_unit
            )
    return len(rows)


@router.patch("/users/me", response_model=UserResponse)
async def update_current_user(
    updates: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current authenticated user's profile fields."""
    update_data = updates.model_dump(exclude_unset=True)

    # Catch a unit switch before the new preferences overwrite the old ones
    previous_unit = user_weight_unit(current_user)
    apply_update(current_user, update_data)

    if "preferences" in update_data:
        new_unit = user_weight_unit(current_user)
        if new_unit != previous_unit:
            converted = _convert_logged_weights(
                db, current_user, previous_unit, new_unit
            )
            logger.info(
                "Converted %s logged weights from %s to %s for user=%s",
                converted, previous_unit, new_unit, current_user.email,
            )

    db.commit()
    db.refresh(current_user)
    return UserResponse.from_orm(current_user)
