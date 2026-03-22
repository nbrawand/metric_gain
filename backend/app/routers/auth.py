"""Authentication endpoints — Google OAuth only."""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
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
    decode_access_token
)

logger = logging.getLogger(__name__)

router = APIRouter()


class ResetMuscleParamsBody(BaseModel):
    experience_level: str = "intermediate"


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
            experience_level="intermediate",
            timezone="UTC",
            preferences="{}",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

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


@router.post("/refresh")
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """
    Refresh access token using refresh token.

    Args:
        refresh_token: Valid refresh token
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
        payload = decode_access_token(refresh_token)

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


@router.get("/users/me/muscle-params")
async def get_muscle_params(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all per-muscle-group optimizer parameters for the current user.

    Each entry includes the params and an optimal volume profile computed
    with 9 total weeks (8 accumulation + 1 deload).
    """
    from app.models.user_muscle_params import UserMuscleParams
    from app.services.volume_optimizer import create_mesocycle_volume_for_params

    params = (
        db.query(UserMuscleParams)
        .filter(UserMuscleParams.user_id == current_user.id)
        .order_by(UserMuscleParams.muscle_group)
        .all()
    )

    total_weeks = 9  # 8 accumulation + 1 deload for display
    result = []
    for p in params:
        entry = {
            "muscle_group": p.muscle_group,
            "params": p.to_params_dict(),
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        try:
            vol = create_mesocycle_volume_for_params(p.to_params_dict(), total_weeks)
            entry["volume_profile"] = [w["sets"] for w in vol["weeks"]]
        except Exception:
            entry["volume_profile"] = []
        result.append(entry)

    return result


@router.post("/users/me/muscle-params/{muscle_group}/reset")
async def reset_single_muscle_params(
    muscle_group: str,
    body: ResetMuscleParamsBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reset a single muscle group's optimizer parameters to defaults for a given experience level.

    Also re-optimizes any active mesocycle instance for this muscle group.
    """
    from app.models.user_muscle_params import UserMuscleParams
    from app.models.mesocycle import MesocycleInstance
    from app.services.volume_optimizer import get_default_muscle_params
    from app.services.volume_prescription import reoptimize_instance_volumes

    experience_level = body.experience_level
    if experience_level not in ("beginner", "intermediate", "advanced"):
        raise HTTPException(status_code=400, detail="Invalid experience level")

    defaults = get_default_muscle_params(experience_level, muscle_group)

    existing = db.query(UserMuscleParams).filter(
        UserMuscleParams.user_id == current_user.id,
        UserMuscleParams.muscle_group == muscle_group,
    ).first()

    if existing:
        for key, val in defaults.items():
            setattr(existing, key, val)
    else:
        param = UserMuscleParams(user_id=current_user.id, muscle_group=muscle_group, **defaults)
        db.add(param)

    db.flush()

    # Re-optimize active mesocycle instances for this muscle group
    active_instances = db.query(MesocycleInstance).filter(
        MesocycleInstance.user_id == current_user.id,
        MesocycleInstance.status == "active",
    ).all()

    for instance in active_instances:
        try:
            reoptimize_instance_volumes(db, instance, current_user, muscle_groups=[muscle_group])
        except Exception as e:
            logger.warning("Re-optimization failed for instance %d: %s", instance.id, e)

    db.commit()
    return {"muscle_group": muscle_group, "experience_level": experience_level, "params": defaults}


@router.post("/users/me/reset-muscle-params")
async def reset_muscle_params(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reset all per-muscle-group optimizer parameters to defaults.

    Deletes all UserMuscleParams for the current user. Next time params
    are needed, ensure_user_muscle_params() will re-seed from defaults
    based on the user's experience level.

    Also re-optimizes any active mesocycle instances.
    """
    from app.models.user_muscle_params import UserMuscleParams
    from app.models.mesocycle import MesocycleInstance
    from app.services.volume_prescription import reoptimize_instance_volumes

    deleted = db.query(UserMuscleParams).filter(
        UserMuscleParams.user_id == current_user.id
    ).delete()
    db.flush()

    # Re-optimize active mesocycle instances (will re-seed params from defaults)
    active_instances = db.query(MesocycleInstance).filter(
        MesocycleInstance.user_id == current_user.id,
        MesocycleInstance.status == "active",
    ).all()

    for instance in active_instances:
        try:
            reoptimize_instance_volumes(db, instance, current_user)
        except Exception as e:
            logger.warning("Re-optimization failed for instance %d: %s", instance.id, e)

    db.commit()
    return {"deleted": deleted, "message": "Volume parameters reset to defaults"}
