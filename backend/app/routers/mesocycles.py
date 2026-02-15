"""Mesocycle template endpoints for creating and managing training block templates."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.mesocycle import Mesocycle, MesocycleInstance, WorkoutTemplate, WorkoutExercise
from app.models.user import User
from app.models.exercise import Exercise
from app.schemas.mesocycle import (
    MesocycleCreate,
    MesocycleUpdate,
    MesocycleResponse,
    MesocycleListResponse,
    WorkoutTemplateCreate,
    WorkoutTemplateResponse,
)
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[MesocycleListResponse])
async def list_mesocycles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of user's mesocycles and stock mesocycles.

    Returns simplified list without nested workout templates.
    """
    from sqlalchemy import or_
    mesocycles = (
        db.query(Mesocycle)
        .filter(
            or_(
                Mesocycle.user_id == current_user.id,
                Mesocycle.is_stock == 1
            )
        )
        .order_by(Mesocycle.is_stock.desc(), Mesocycle.created_at.desc())
        .all()
    )

    # Convert to list response with workout count
    result = []
    for mesocycle in mesocycles:
        workout_count = len(mesocycle.workout_templates)
        result.append(
            MesocycleListResponse(
                **mesocycle.__dict__,
                workout_count=workout_count,
            )
        )

    return result


@router.get("/{mesocycle_id}", response_model=MesocycleResponse)
async def get_mesocycle(
    mesocycle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get specific mesocycle with full details including workouts and exercises.
    """
    mesocycle = (
        db.query(Mesocycle)
        .filter(Mesocycle.id == mesocycle_id)
        .options(
            joinedload(Mesocycle.workout_templates).joinedload(
                WorkoutTemplate.exercises
            )
        )
        .first()
    )

    if not mesocycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mesocycle not found"
        )

    # Check ownership (allow access to stock mesocycles)
    if mesocycle.user_id != current_user.id and not mesocycle.is_stock:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this mesocycle",
        )

    # Load exercise details for each workout exercise
    for workout in mesocycle.workout_templates:
        for workout_exercise in workout.exercises:
            exercise = (
                db.query(Exercise).filter(Exercise.id == workout_exercise.exercise_id).first()
            )
            if exercise:
                workout_exercise.exercise = exercise

    return mesocycle


@router.post("/", response_model=MesocycleResponse, status_code=status.HTTP_201_CREATED)
async def create_mesocycle(
    mesocycle_data: MesocycleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new mesocycle with workout templates and exercises.

    Allows creating the entire mesocycle structure in one request.
    """
    # Create mesocycle template
    new_mesocycle = Mesocycle(
        user_id=current_user.id,
        name=mesocycle_data.name,
        description=mesocycle_data.description,
        weeks=mesocycle_data.weeks,
        days_per_week=mesocycle_data.days_per_week,
    )

    db.add(new_mesocycle)
    db.flush()  # Get mesocycle ID without committing

    # Create workout templates
    for workout_data in mesocycle_data.workout_templates:
        workout_template = WorkoutTemplate(
            mesocycle_id=new_mesocycle.id,
            name=workout_data.name,
            description=workout_data.description,
            order_index=workout_data.order_index,
        )

        db.add(workout_template)
        db.flush()  # Get workout template ID

        # Create workout exercises
        for exercise_data in workout_data.exercises:
            # Verify exercise exists and user has access
            exercise = db.query(Exercise).filter(Exercise.id == exercise_data.exercise_id).first()
            if not exercise:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Exercise with ID {exercise_data.exercise_id} not found",
                )

            # Check if custom exercise belongs to user
            if exercise.is_custom and exercise.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"You don't have access to exercise with ID {exercise_data.exercise_id}",
                )

            workout_exercise = WorkoutExercise(
                workout_template_id=workout_template.id,
                exercise_id=exercise_data.exercise_id,
                order_index=exercise_data.order_index,
                target_sets=exercise_data.target_sets,
                target_reps_min=exercise_data.target_reps_min,
                target_reps_max=exercise_data.target_reps_max,
                starting_rir=exercise_data.starting_rir,
                ending_rir=exercise_data.ending_rir,
                notes=exercise_data.notes,
            )

            db.add(workout_exercise)

    db.commit()
    db.refresh(new_mesocycle)

    # Load full mesocycle with relationships
    mesocycle = (
        db.query(Mesocycle)
        .filter(Mesocycle.id == new_mesocycle.id)
        .options(
            joinedload(Mesocycle.workout_templates).joinedload(
                WorkoutTemplate.exercises
            )
        )
        .first()
    )

    # Load exercise details
    for workout in mesocycle.workout_templates:
        for workout_exercise in workout.exercises:
            exercise = (
                db.query(Exercise).filter(Exercise.id == workout_exercise.exercise_id).first()
            )
            if exercise:
                workout_exercise.exercise = exercise

    return mesocycle


@router.put("/{mesocycle_id}", response_model=MesocycleResponse)
async def update_mesocycle(
    mesocycle_id: int,
    mesocycle_data: MesocycleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update mesocycle details (not including workouts/exercises).

    Use separate endpoints to add/update/delete workout templates.
    """
    mesocycle = db.query(Mesocycle).filter(Mesocycle.id == mesocycle_id).first()

    if not mesocycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mesocycle not found"
        )

    # Prevent editing of stock mesocycles
    if mesocycle.is_stock:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Stock mesocycles cannot be modified",
        )

    # Check ownership
    if mesocycle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own mesocycles",
        )

    # Update fields
    update_data = mesocycle_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(mesocycle, field, value)

    db.commit()
    db.refresh(mesocycle)

    # Load full mesocycle with relationships
    mesocycle = (
        db.query(Mesocycle)
        .filter(Mesocycle.id == mesocycle_id)
        .options(
            joinedload(Mesocycle.workout_templates).joinedload(
                WorkoutTemplate.exercises
            )
        )
        .first()
    )

    # Load exercise details
    for workout in mesocycle.workout_templates:
        for workout_exercise in workout.exercises:
            exercise = (
                db.query(Exercise).filter(Exercise.id == workout_exercise.exercise_id).first()
            )
            if exercise:
                workout_exercise.exercise = exercise

    return mesocycle


@router.delete("/{mesocycle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mesocycle(
    mesocycle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a mesocycle and all associated workout templates and exercises.
    """
    mesocycle = db.query(Mesocycle).filter(Mesocycle.id == mesocycle_id).first()

    if not mesocycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mesocycle not found"
        )

    # Prevent deletion of stock mesocycles
    if mesocycle.is_stock:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Stock mesocycles cannot be deleted",
        )

    # Check ownership
    if mesocycle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own mesocycles",
        )

    # Block deletion if there are active instances
    active_instances = (
        db.query(MesocycleInstance)
        .filter(
            MesocycleInstance.mesocycle_template_id == mesocycle_id,
            MesocycleInstance.status == "active",
        )
        .count()
    )
    if active_instances > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete template with active instances. End the active instance first.",
        )

    db.delete(mesocycle)
    db.commit()

    return None


@router.post(
    "/{mesocycle_id}/workout-templates",
    response_model=WorkoutTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_workout_template(
    mesocycle_id: int,
    workout_data: WorkoutTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a workout template to an existing mesocycle.
    """
    mesocycle = db.query(Mesocycle).filter(Mesocycle.id == mesocycle_id).first()

    if not mesocycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mesocycle not found"
        )

    # Prevent modifying stock mesocycles
    if mesocycle.is_stock:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Stock mesocycles cannot be modified",
        )

    # Check ownership
    if mesocycle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own mesocycles",
        )

    # Create workout template
    workout_template = WorkoutTemplate(
        mesocycle_id=mesocycle_id,
        name=workout_data.name,
        description=workout_data.description,
        order_index=workout_data.order_index,
    )

    db.add(workout_template)
    db.flush()

    # Create workout exercises
    for exercise_data in workout_data.exercises:
        # Verify exercise exists and user has access
        exercise = db.query(Exercise).filter(Exercise.id == exercise_data.exercise_id).first()
        if not exercise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exercise with ID {exercise_data.exercise_id} not found",
            )

        if exercise.is_custom and exercise.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You don't have access to exercise with ID {exercise_data.exercise_id}",
            )

        workout_exercise = WorkoutExercise(
            workout_template_id=workout_template.id,
            exercise_id=exercise_data.exercise_id,
            order_index=exercise_data.order_index,
            target_sets=exercise_data.target_sets,
            target_reps_min=exercise_data.target_reps_min,
            target_reps_max=exercise_data.target_reps_max,
            starting_rir=exercise_data.starting_rir,
            ending_rir=exercise_data.ending_rir,
            notes=exercise_data.notes,
        )

        db.add(workout_exercise)

    db.commit()
    db.refresh(workout_template)

    # Load exercise details
    for workout_exercise in workout_template.exercises:
        exercise = db.query(Exercise).filter(Exercise.id == workout_exercise.exercise_id).first()
        if exercise:
            workout_exercise.exercise = exercise

    return workout_template


@router.put(
    "/{mesocycle_id}/workout-templates",
    response_model=MesocycleResponse,
)
async def replace_workout_templates(
    mesocycle_id: int,
    workout_templates_data: List[WorkoutTemplateCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Replace all workout templates for a mesocycle.

    Deletes all existing workout templates (and their exercises via cascade)
    and creates new ones from the provided data.
    """
    mesocycle = db.query(Mesocycle).filter(Mesocycle.id == mesocycle_id).first()

    if not mesocycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mesocycle not found"
        )

    if mesocycle.is_stock:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Stock mesocycles cannot be modified",
        )

    if mesocycle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own mesocycles",
        )

    # Delete all existing workout templates (cascades to exercises)
    db.query(WorkoutExercise).filter(
        WorkoutExercise.workout_template_id.in_(
            db.query(WorkoutTemplate.id).filter(
                WorkoutTemplate.mesocycle_id == mesocycle_id
            )
        )
    ).delete(synchronize_session=False)
    db.query(WorkoutTemplate).filter(
        WorkoutTemplate.mesocycle_id == mesocycle_id
    ).delete(synchronize_session=False)

    # Create new workout templates
    for workout_data in workout_templates_data:
        workout_template = WorkoutTemplate(
            mesocycle_id=mesocycle_id,
            name=workout_data.name,
            description=workout_data.description,
            order_index=workout_data.order_index,
        )
        db.add(workout_template)
        db.flush()

        for exercise_data in workout_data.exercises:
            exercise = db.query(Exercise).filter(Exercise.id == exercise_data.exercise_id).first()
            if not exercise:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Exercise with ID {exercise_data.exercise_id} not found",
                )
            if exercise.is_custom and exercise.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"You don't have access to exercise with ID {exercise_data.exercise_id}",
                )

            db.add(WorkoutExercise(
                workout_template_id=workout_template.id,
                exercise_id=exercise_data.exercise_id,
                order_index=exercise_data.order_index,
                target_sets=exercise_data.target_sets,
                target_reps_min=exercise_data.target_reps_min,
                target_reps_max=exercise_data.target_reps_max,
                starting_rir=exercise_data.starting_rir,
                ending_rir=exercise_data.ending_rir,
                notes=exercise_data.notes,
            ))

    db.commit()

    # Load and return full mesocycle
    mesocycle = (
        db.query(Mesocycle)
        .filter(Mesocycle.id == mesocycle_id)
        .options(
            joinedload(Mesocycle.workout_templates).joinedload(
                WorkoutTemplate.exercises
            )
        )
        .first()
    )

    for workout in mesocycle.workout_templates:
        for workout_exercise in workout.exercises:
            exercise = (
                db.query(Exercise).filter(Exercise.id == workout_exercise.exercise_id).first()
            )
            if exercise:
                workout_exercise.exercise = exercise

    return mesocycle
