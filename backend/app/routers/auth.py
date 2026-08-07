"""Authentication endpoints — Google OAuth only."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
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

router = APIRouter()


class GoogleLoginBody(BaseModel):
    id_token: str


@router.get("/google-client-id")
async def get_google_client_id():
    """Return the Google OAuth client ID for the frontend."""
    return {"client_id": settings.GOOGLE_CLIENT_ID}


@router.post("/google", response_model=AuthResponse)
async def google_login(body: GoogleLoginBody, db: Session = Depends(get_db)):
    """Authenticate via Google OAuth id_token. Creates account on first login."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google login not configured")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            body.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = idinfo.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Google token missing email")

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

    user.last_login = datetime.utcnow()
    db.commit()

    token_data = {"sub": str(user.id), "email": user.email}
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
async def refresh_access_token(body: RefreshRequest, db: Session = Depends(get_db)):
    """
    Refresh access token using refresh token.

    Args:
        body: JSON body containing refresh_token
        db: Database session

    Returns:
        New access token

    Raises:
        HTTPException: If refresh token is invalid
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
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

        # Create new access token
        token_data = {"sub": str(user.id), "email": user.email}
        new_access_token = create_access_token(token_data)

        return {"access_token": new_access_token, "token_type": "bearer"}

    except Exception:
        raise credentials_exception


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


@router.patch("/users/me", response_model=UserResponse)
async def update_current_user(
    updates: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current authenticated user's profile fields."""
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return UserResponse.from_orm(current_user)
