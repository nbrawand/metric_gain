"""Exercise endpoints for browsing and creating exercises."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.exercise import Exercise
from app.models.user import User
from app.schemas.exercise import ExerciseCreate, ExerciseResponse, ExerciseUpdate
from app.utils.auth import get_current_user
from app.utils.db import apply_update

router = APIRouter()


@router.get("/", response_model=List[ExerciseResponse])
async def list_exercises(
    muscle_group: Optional[str] = Query(None, description="Filter by muscle group"),
    equipment: Optional[str] = Query(None, description="Filter by equipment"),
    search: Optional[str] = Query(None, description="Search by name"),
    include_custom: bool = Query(True, description="Include user's custom exercises"),
    skip: int = Query(0, ge=0, description="Number of exercises to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of exercises to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of exercises with optional filters.

    Returns default exercises and user's custom exercises.
    """
    # Start with base query for default exercises
    query = db.query(Exercise).filter(
        or_(
            Exercise.is_custom == False,  # Default exercises
            Exercise.user_id == current_user.id if include_custom else False  # User's custom exercises
        )
    )

    # Apply filters
    if muscle_group:
        query = query.filter(Exercise.muscle_group.ilike(f"%{muscle_group}%"))

    if equipment:
        query = query.filter(Exercise.equipment.ilike(f"%{equipment}%"))

    if search:
        query = query.filter(Exercise.name.ilike(f"%{search}%"))

    # Order by name and apply pagination
    exercises = query.order_by(Exercise.name).offset(skip).limit(limit).all()

    return exercises


@router.get("/muscle-groups", response_model=List[str])
async def get_muscle_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of unique muscle groups from the exercises this user can see.
    """
    # Scoped to the same rows list_exercises returns. Querying every row leaked
    # the muscle group names other users had typed on their private exercises.
    result = (
        db.query(Exercise.muscle_group)
        .filter(
            or_(
                Exercise.is_custom == False,  # noqa: E712 - SQL comparison
                Exercise.user_id == current_user.id,
            )
        )
        .distinct()
        .order_by(Exercise.muscle_group)
        .all()
    )

    # Extract muscle group names from result tuples
    muscle_groups = [row[0] for row in result if row[0]]

    return muscle_groups


@router.get("/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific exercise by ID.

    Only allows access to default exercises or user's own custom exercises.
    """
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()

    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found."
        )

    # Check access permissions
    if exercise.is_custom and exercise.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to that exercise."
        )

    return exercise


@router.post("/", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_exercise(
    exercise_data: ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new custom exercise.

    Custom exercises are only visible to the creating user.
    """
    # Check if user already has a custom exercise with this name
    existing_exercise = db.query(Exercise).filter(
        Exercise.name == exercise_data.name,
        Exercise.user_id == current_user.id,
        Exercise.is_custom == True
    ).first()

    if existing_exercise:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a custom exercise with that name."
        )

    # Create new custom exercise
    new_exercise = Exercise(
        **exercise_data.model_dump(),
        is_custom=True,
        user_id=current_user.id
    )

    db.add(new_exercise)
    db.commit()
    db.refresh(new_exercise)

    return new_exercise


@router.put("/{exercise_id}", response_model=ExerciseResponse)
async def update_custom_exercise(
    exercise_id: int,
    exercise_data: ExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a custom exercise.

    Only the owner can update their custom exercises.
    Default exercises cannot be updated.
    """
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()

    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found."
        )

    # Check if exercise is custom and belongs to current user
    if not exercise.is_custom:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Stock exercises cannot be edited."
        )

    if exercise.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own custom exercises."
        )

    # Update exercise with provided fields
    update_data = exercise_data.model_dump(exclude_unset=True)
    apply_update(exercise, update_data)

    db.commit()
    db.refresh(exercise)

    return exercise


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a custom exercise.

    Only the owner can delete their custom exercises.
    Default exercises cannot be deleted.
    """
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()

    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found."
        )

    # Check if exercise is custom and belongs to current user
    if not exercise.is_custom:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Stock exercises cannot be deleted."
        )

    if exercise.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own custom exercises."
        )

    # Both references cascade, so deleting an exercise in use would take logged
    # sets and template entries down with it
    from app.models.mesocycle import WorkoutExercise
    from app.models.workout_session import WorkoutSet

    # Scoped to this user's own rows. Counting every row in the table let another
    # account's reference to the exercise block the owner from ever deleting it,
    # with nothing in the UI to explain why.
    from app.models.workout_session import WorkoutSession
    from app.models.mesocycle import Mesocycle, WorkoutTemplate

    logged_sets = (
        db.query(WorkoutSet)
        .join(WorkoutSession, WorkoutSet.workout_session_id == WorkoutSession.id)
        .filter(
            WorkoutSet.exercise_id == exercise_id,
            WorkoutSession.user_id == current_user.id,
        )
        .count()
    )
    in_templates = (
        db.query(WorkoutExercise)
        .join(WorkoutTemplate, WorkoutExercise.workout_template_id == WorkoutTemplate.id)
        .join(Mesocycle, WorkoutTemplate.mesocycle_id == Mesocycle.id)
        .filter(
            WorkoutExercise.exercise_id == exercise_id,
            Mesocycle.user_id == current_user.id,
        )
        .count()
    )
    if logged_sets or in_templates:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This exercise is used in your workouts or templates, so it cannot be deleted.",
        )

    db.delete(exercise)
    db.commit()

    return None
