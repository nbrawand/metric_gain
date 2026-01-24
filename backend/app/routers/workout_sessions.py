"""API routes for workout session management."""

from typing import List
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.workout_session import WorkoutSession, WorkoutSet
from app.models.user import User
from app.schemas.workout_session import (
    WorkoutSessionCreate,
    WorkoutSessionUpdate,
    WorkoutSessionResponse,
    WorkoutSessionListResponse,
    WorkoutSetCreate,
    WorkoutSetUpdate,
    WorkoutSetResponse,
)
from app.routers.auth import get_current_user


router = APIRouter(prefix="/workout-sessions", tags=["workout-sessions"])


@router.post("/", response_model=WorkoutSessionResponse, status_code=status.HTTP_201_CREATED)
def create_workout_session(
    session_data: WorkoutSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new workout session."""
    workout_session = WorkoutSession(
        user_id=current_user.id,
        **session_data.model_dump()
    )
    db.add(workout_session)
    db.commit()
    db.refresh(workout_session)
    return workout_session


@router.get("/", response_model=List[WorkoutSessionListResponse])
def list_workout_sessions(
    mesocycle_id: int = None,
    status_filter: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all workout sessions for the current user."""
    query = db.query(
        WorkoutSession,
        func.count(WorkoutSet.id).label("set_count")
    ).outerjoin(WorkoutSet).filter(
        WorkoutSession.user_id == current_user.id
    ).group_by(WorkoutSession.id)

    if mesocycle_id:
        query = query.filter(WorkoutSession.mesocycle_id == mesocycle_id)

    if status_filter:
        query = query.filter(WorkoutSession.status == status_filter)

    sessions_with_counts = query.order_by(
        WorkoutSession.workout_date.desc()
    ).offset(skip).limit(limit).all()

    # Format response with set count
    result = []
    for session, set_count in sessions_with_counts:
        session_dict = {
            "id": session.id,
            "user_id": session.user_id,
            "mesocycle_id": session.mesocycle_id,
            "workout_template_id": session.workout_template_id,
            "workout_date": session.workout_date,
            "week_number": session.week_number,
            "day_number": session.day_number,
            "status": session.status,
            "duration_minutes": session.duration_minutes,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "completed_at": session.completed_at,
            "set_count": set_count,
        }
        result.append(WorkoutSessionListResponse(**session_dict))

    return result


@router.get("/{session_id}", response_model=WorkoutSessionResponse)
def get_workout_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific workout session by ID."""
    workout_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()

    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )

    return workout_session


@router.patch("/{session_id}", response_model=WorkoutSessionResponse)
def update_workout_session(
    session_id: int,
    session_update: WorkoutSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a workout session."""
    workout_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()

    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )

    update_data = session_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workout_session, field, value)

    # If marking as completed, set completed_at timestamp
    if update_data.get("status") == "completed" and not workout_session.completed_at:
        from datetime import datetime
        workout_session.completed_at = datetime.now()

    db.commit()
    db.refresh(workout_session)
    return workout_session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a workout session."""
    workout_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()

    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )

    db.delete(workout_session)
    db.commit()
    return None


# Workout Set endpoints
@router.post("/{session_id}/sets", response_model=WorkoutSetResponse, status_code=status.HTTP_201_CREATED)
def add_workout_set(
    session_id: int,
    set_data: WorkoutSetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a set to a workout session."""
    # Verify the workout session exists and belongs to the current user
    workout_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()

    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )

    workout_set = WorkoutSet(
        workout_session_id=session_id,
        **set_data.model_dump()
    )
    db.add(workout_set)
    db.commit()
    db.refresh(workout_set)
    return workout_set


@router.get("/{session_id}/sets", response_model=List[WorkoutSetResponse])
def list_workout_sets(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all sets for a workout session."""
    # Verify the workout session exists and belongs to the current user
    workout_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()

    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )

    workout_sets = db.query(WorkoutSet).filter(
        WorkoutSet.workout_session_id == session_id
    ).order_by(WorkoutSet.order_index, WorkoutSet.set_number).all()

    return workout_sets


@router.patch("/{session_id}/sets/{set_id}", response_model=WorkoutSetResponse)
def update_workout_set(
    session_id: int,
    set_id: int,
    set_update: WorkoutSetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a specific set in a workout session."""
    # Verify the workout session exists and belongs to the current user
    workout_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()

    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )

    workout_set = db.query(WorkoutSet).filter(
        WorkoutSet.id == set_id,
        WorkoutSet.workout_session_id == session_id
    ).first()

    if not workout_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout set not found"
        )

    update_data = set_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workout_set, field, value)

    db.commit()
    db.refresh(workout_set)
    return workout_set


@router.delete("/{session_id}/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_set(
    session_id: int,
    set_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a set from a workout session."""
    # Verify the workout session exists and belongs to the current user
    workout_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()

    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )

    workout_set = db.query(WorkoutSet).filter(
        WorkoutSet.id == set_id,
        WorkoutSet.workout_session_id == session_id
    ).first()

    if not workout_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout set not found"
        )

    db.delete(workout_set)
    db.commit()
    return None
