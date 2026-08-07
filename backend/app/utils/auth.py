"""Authentication utilities for JWT tokens."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User

# HTTP Bearer token security
security = HTTPBearer()


def as_utc(value: Optional[datetime]) -> Optional[datetime]:
    """Normalize a stored timestamp to an aware UTC datetime.

    Timestamps come back aware from Postgres and naive from SQLite, and the two
    cannot be compared to each other. Converting (rather than stamping the tz
    on with replace()) matters when the connection's TimeZone is not UTC:
    replace() kept the wall-clock reading and silently shifted the instant by
    the offset, which moved trial expiry by hours.
    """
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary of data to encode in token (typically user_id, email)
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """
    Create a JWT refresh token (longer expiration).

    Args:
        data: Dictionary of data to encode in token

    Returns:
        Encoded JWT refresh token string
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.

    Args:
        token: JWT token string

    Returns:
        Decoded token payload

    Raises:
        HTTPException: If token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Your session has expired. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

        # Verify token type
        if payload.get("type") != "access":
            raise credentials_exception

        return payload

    except JWTError:
        raise credentials_exception


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to get the current authenticated user.

    Validates the JWT token and retrieves the user from the database.

    Args:
        credentials: HTTP Bearer token from request header
        db: Database session

    Returns:
        User object of authenticated user

    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Your session has expired. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    payload = decode_access_token(token)

    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    # A signed token with a non-numeric subject would otherwise blow up as a 500
    try:
        user_id = int(user_id_str)
    except (TypeError, ValueError):
        raise credentials_exception

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    # Tokens minted before the user's last revocation are dead
    if payload.get("tv", 0) != user.token_version:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )

    return user


async def require_active_subscription(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency that checks the user has an active subscription or valid trial."""
    sub_status = current_user.subscription_status
    if sub_status == "active":
        return current_user
    if sub_status == "trialing":
        trial_ends_at = as_utc(current_user.trial_ends_at)
        if trial_ends_at and trial_ends_at > datetime.now(timezone.utc):
            return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Your free trial has ended. Subscribe to keep training.",
    )


