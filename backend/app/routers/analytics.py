"""Analytics endpoints — reading training history back to the lifter."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.exercise import Exercise
from app.models.user import User
from app.services.analytics import (
    personal_records,
    strength_over_time,
    training_overview,
    weekly_volume_by_muscle_group,
)
from app.utils.auth import get_current_user
from app.utils.db import user_weight_unit

router = APIRouter()


@router.get("/overview")
async def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Headline totals across every block this user has trained."""
    overview = training_overview(db, current_user.id)
    overview["weight_unit"] = user_weight_unit(current_user)
    return overview


@router.get("/strength/{exercise_id}")
async def get_strength_history(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Estimated 1RM per session for one exercise, oldest first."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found."
        )
    # Same rule the rest of the app uses: a custom exercise belongs to one user
    if exercise.is_custom and exercise.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to that exercise.",
        )

    return {
        "exercise_id": exercise.id,
        "exercise_name": exercise.name,
        "muscle_group": exercise.muscle_group,
        "weight_unit": user_weight_unit(current_user),
        "points": strength_over_time(db, current_user.id, exercise_id),
    }


@router.get("/volume")
async def get_volume_history(
    weeks: int = Query(12, ge=1, le=52),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hard sets per muscle group per calendar week, oldest first."""
    return weekly_volume_by_muscle_group(db, current_user.id, weeks)


@router.get("/records")
async def get_personal_records(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Best estimated 1RM and heaviest set per exercise, strongest first."""
    records = personal_records(db, current_user.id)
    return {
        "weight_unit": user_weight_unit(current_user),
        "records": records[:limit],
    }


@router.get("/trained-exercises")
async def get_trained_exercises(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exercises this user has actually logged, for the strength chart picker.

    The full library is 140 entries; offering all of them would mostly offer
    empty charts.
    """
    records = personal_records(db, current_user.id)
    return [
        {
            "id": r["exercise_id"],
            "name": r["exercise_name"],
            "muscle_group": r["muscle_group"],
        }
        for r in sorted(records, key=lambda r: r["exercise_name"])
    ]
