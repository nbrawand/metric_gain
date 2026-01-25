"""Mesocycle instance endpoints for starting and managing active training blocks."""

from typing import List
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.mesocycle import Mesocycle, MesocycleInstance, WorkoutTemplate
from app.models.user import User
from app.models.exercise import Exercise
from app.schemas.mesocycle import (
    MesocycleInstanceCreate,
    MesocycleInstanceUpdate,
    MesocycleInstanceResponse,
    MesocycleInstanceListResponse,
)
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[MesocycleInstanceListResponse])
async def list_mesocycle_instances(
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of user's mesocycle instances.

    Optional status filter: active, completed, abandoned
    """
    query = db.query(MesocycleInstance).filter(
        MesocycleInstance.user_id == current_user.id
    )

    if status_filter:
        query = query.filter(MesocycleInstance.status == status_filter)

    instances = query.order_by(MesocycleInstance.created_at.desc()).all()

    # Convert to list response with template info
    result = []
    for instance in instances:
        template = db.query(Mesocycle).filter(Mesocycle.id == instance.mesocycle_template_id).first()
        result.append(
            MesocycleInstanceListResponse(
                id=instance.id,
                user_id=instance.user_id,
                mesocycle_template_id=instance.mesocycle_template_id,
                status=instance.status,
                start_date=instance.start_date,
                end_date=instance.end_date,
                created_at=instance.created_at,
                updated_at=instance.updated_at,
                template_name=template.name if template else "Unknown",
                template_weeks=template.weeks if template else 0,
                template_days_per_week=template.days_per_week if template else 0,
            )
        )

    return result


@router.get("/active", response_model=MesocycleInstanceResponse)
async def get_active_instance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the currently active mesocycle instance.

    Returns 404 if no active instance exists.
    """
    instance = (
        db.query(MesocycleInstance)
        .filter(
            MesocycleInstance.user_id == current_user.id,
            MesocycleInstance.status == "active"
        )
        .first()
    )

    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active mesocycle instance found"
        )

    # Load template with workout templates
    template = (
        db.query(Mesocycle)
        .filter(Mesocycle.id == instance.mesocycle_template_id)
        .options(
            joinedload(Mesocycle.workout_templates).joinedload(
                WorkoutTemplate.exercises
            )
        )
        .first()
    )

    # Load exercise details
    if template:
        for workout in template.workout_templates:
            for workout_exercise in workout.exercises:
                exercise = db.query(Exercise).filter(
                    Exercise.id == workout_exercise.exercise_id
                ).first()
                if exercise:
                    workout_exercise.exercise = exercise

    instance.mesocycle_template = template
    return instance


@router.get("/{instance_id}", response_model=MesocycleInstanceResponse)
async def get_mesocycle_instance(
    instance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get specific mesocycle instance with full template details.
    """
    instance = (
        db.query(MesocycleInstance)
        .filter(MesocycleInstance.id == instance_id)
        .first()
    )

    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mesocycle instance not found"
        )

    # Check ownership
    if instance.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this mesocycle instance",
        )

    # Load template with workout templates
    template = (
        db.query(Mesocycle)
        .filter(Mesocycle.id == instance.mesocycle_template_id)
        .options(
            joinedload(Mesocycle.workout_templates).joinedload(
                WorkoutTemplate.exercises
            )
        )
        .first()
    )

    # Load exercise details
    if template:
        for workout in template.workout_templates:
            for workout_exercise in workout.exercises:
                exercise = db.query(Exercise).filter(
                    Exercise.id == workout_exercise.exercise_id
                ).first()
                if exercise:
                    workout_exercise.exercise = exercise

    instance.mesocycle_template = template
    return instance


@router.post("/", response_model=MesocycleInstanceResponse, status_code=status.HTTP_201_CREATED)
async def start_mesocycle_instance(
    instance_data: MesocycleInstanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start a new mesocycle instance from a template.

    Only one active instance is allowed per user at a time.
    """
    # Check if user already has an active instance
    existing_active = (
        db.query(MesocycleInstance)
        .filter(
            MesocycleInstance.user_id == current_user.id,
            MesocycleInstance.status == "active"
        )
        .first()
    )

    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active mesocycle. End it before starting a new one."
        )

    # Verify template exists and belongs to user
    template = db.query(Mesocycle).filter(
        Mesocycle.id == instance_data.mesocycle_template_id
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mesocycle template not found"
        )

    # Allow starting from own templates or stock templates
    if template.user_id != current_user.id and not template.is_stock:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only start instances from your own templates or stock templates"
        )

    # Create instance
    new_instance = MesocycleInstance(
        user_id=current_user.id,
        mesocycle_template_id=instance_data.mesocycle_template_id,
        status="active",
        start_date=instance_data.start_date or date.today(),
    )

    db.add(new_instance)
    db.commit()
    db.refresh(new_instance)

    # Load template with full details
    template = (
        db.query(Mesocycle)
        .filter(Mesocycle.id == new_instance.mesocycle_template_id)
        .options(
            joinedload(Mesocycle.workout_templates).joinedload(
                WorkoutTemplate.exercises
            )
        )
        .first()
    )

    # Load exercise details
    if template:
        for workout in template.workout_templates:
            for workout_exercise in workout.exercises:
                exercise = db.query(Exercise).filter(
                    Exercise.id == workout_exercise.exercise_id
                ).first()
                if exercise:
                    workout_exercise.exercise = exercise

    new_instance.mesocycle_template = template
    return new_instance


@router.patch("/{instance_id}", response_model=MesocycleInstanceResponse)
async def update_mesocycle_instance(
    instance_id: int,
    instance_data: MesocycleInstanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update mesocycle instance status (e.g., mark as completed or abandoned).
    """
    instance = db.query(MesocycleInstance).filter(
        MesocycleInstance.id == instance_id
    ).first()

    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mesocycle instance not found"
        )

    # Check ownership
    if instance.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own mesocycle instances"
        )

    # Update fields
    update_data = instance_data.model_dump(exclude_unset=True)

    # If marking as completed, set end_date
    if update_data.get("status") in ["completed", "abandoned"]:
        instance.end_date = date.today()

    for field, value in update_data.items():
        setattr(instance, field, value)

    db.commit()
    db.refresh(instance)

    # Load template with full details
    template = (
        db.query(Mesocycle)
        .filter(Mesocycle.id == instance.mesocycle_template_id)
        .options(
            joinedload(Mesocycle.workout_templates).joinedload(
                WorkoutTemplate.exercises
            )
        )
        .first()
    )

    # Load exercise details
    if template:
        for workout in template.workout_templates:
            for workout_exercise in workout.exercises:
                exercise = db.query(Exercise).filter(
                    Exercise.id == workout_exercise.exercise_id
                ).first()
                if exercise:
                    workout_exercise.exercise = exercise

    instance.mesocycle_template = template
    return instance


@router.delete("/{instance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mesocycle_instance(
    instance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a mesocycle instance and all associated workout sessions.
    """
    instance = db.query(MesocycleInstance).filter(
        MesocycleInstance.id == instance_id
    ).first()

    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mesocycle instance not found"
        )

    # Check ownership
    if instance.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own mesocycle instances"
        )

    db.delete(instance)
    db.commit()

    return None
