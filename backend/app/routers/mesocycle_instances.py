"""Mesocycle instance endpoints for starting and managing active training blocks."""

import json
from collections import OrderedDict
from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.mesocycle import Mesocycle, MesocycleInstance, WorkoutTemplate
from app.models.workout_session import WorkoutSession, WorkoutSet
from app.models.user import User
from app.models.exercise import Exercise
from app.schemas.mesocycle import (
    MesocycleInstanceCreate,
    MesocycleInstanceUpdate,
    MesocycleInstanceResponse,
    MesocycleInstanceListResponse,
)
from app.utils.auth import get_current_user
from app.services.progression import (
    compute_sets_for_week,
    compute_target_rir,
    compute_progression_targets,
    find_previous_performance,
)

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

    # Convert to list response with template info (prefer snapshots, fall back to template query)
    result = []
    for instance in instances:
        # Use snapshot fields if available, otherwise fall back to template query
        if instance.template_name is not None:
            t_name = instance.template_name
            t_weeks = instance.template_weeks
            t_days = instance.template_days_per_week
        else:
            template = db.query(Mesocycle).filter(Mesocycle.id == instance.mesocycle_template_id).first()
            t_name = template.name if template else "Unknown"
            t_weeks = template.weeks if template else 0
            t_days = template.days_per_week if template else 0

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
                template_name=t_name,
                template_weeks=t_weeks,
                template_days_per_week=t_days,
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


def _generate_sets_for_session(
    db,
    workout_session,
    workout_template,
    week_number,
    total_weeks,
    user_id,
    mesocycle_instance_id,
    day_number,
):
    """Generate workout sets from a template for a given session.

    Set count follows the user's plan: target_sets + weekly_set_increment
    per week. RIR ramps 3 -> 0 across the mesocycle.
    """
    target_rir = compute_target_rir(week_number, total_weeks)

    for template_exercise in workout_template.exercises:
        num_sets = compute_sets_for_week(
            template_exercise.target_sets,
            template_exercise.weekly_set_increment,
            week_number,
        )

        # Look up previous performance for target_weight/target_reps
        prev_weight, prev_reps = find_previous_performance(
            db, user_id, template_exercise.exercise_id,
            mesocycle_instance_id=mesocycle_instance_id,
            current_week=week_number,
            current_day=day_number,
        )
        hist_target_weight, hist_target_reps = compute_progression_targets(
            prev_weight, prev_reps, template_exercise.target_reps_max,
        )

        for set_num in range(1, num_sets + 1):
            workout_set = WorkoutSet(
                workout_session_id=workout_session.id,
                exercise_id=template_exercise.exercise_id,
                set_number=set_num,
                order_index=template_exercise.order_index * 100 + set_num,
                weight=0,
                reps=0,
                target_weight=hist_target_weight,
                target_reps=hist_target_reps,
                target_rir=target_rir,
            )
            db.add(workout_set)


def _generate_sets_from_source(
    db,
    workout_session,
    workout_template,
    source_session,
    total_weeks,
    user_id,
    mesocycle_instance_id,
    day_number,
    week_number=1,
):
    """Generate sets for week 1 by copying from a source session (previous instance).

    The template drives which exercises appear and how many sets each gets, so a
    newly added exercise still gets its week-1 sets even though the source
    session predates it. Weights and reps are seeded from the source session
    where it has them. Exercises the source ran but the template no longer lists
    (swapped mid-run) carry over at their source set count.
    """
    source_sets = db.query(WorkoutSet).filter(
        WorkoutSet.workout_session_id == source_session.id
    ).order_by(WorkoutSet.order_index, WorkoutSet.set_number).all()

    source_by_exercise = OrderedDict()
    for ss in source_sets:
        source_by_exercise.setdefault(ss.exercise_id, []).append(ss)

    target_rir = compute_target_rir(week_number, total_weeks)

    def _create_sets(exercise_id, num_sets, order_base, fallback_reps, source_exercise_sets):
        for set_num in range(1, num_sets + 1):
            source_set = None
            fallback_set = None
            if source_exercise_sets:
                source_set = next(
                    (s for s in source_exercise_sets if s.set_number == set_num), None
                )
                fallback_set = source_set or source_exercise_sets[-1]

            target_weight = None
            target_reps = fallback_set.target_reps if fallback_set else fallback_reps
            if source_set:
                if source_set.weight > 0:
                    target_weight = source_set.weight
                if source_set.reps > 0:
                    target_reps = source_set.reps

            # Fallback to cascading lookup if source has no weight data
            if target_weight is None:
                prev_weight, prev_reps = find_previous_performance(
                    db, user_id, exercise_id,
                    mesocycle_instance_id=mesocycle_instance_id,
                    current_week=week_number,
                    current_day=day_number,
                )
                if prev_weight is not None:
                    target_weight, target_reps = compute_progression_targets(
                        prev_weight, prev_reps, target_reps,
                    )
                elif prev_reps is not None and target_reps is None:
                    target_reps = prev_reps

            workout_set = WorkoutSet(
                workout_session_id=workout_session.id,
                exercise_id=exercise_id,
                set_number=set_num,
                order_index=order_base + set_num,
                weight=0,
                reps=0,
                target_weight=target_weight,
                target_reps=target_reps,
                target_rir=target_rir,
            )
            db.add(workout_set)

    for template_exercise in workout_template.exercises:
        _create_sets(
            template_exercise.exercise_id,
            compute_sets_for_week(
                template_exercise.target_sets,
                template_exercise.weekly_set_increment,
                week_number,
            ),
            template_exercise.order_index * 100,
            template_exercise.target_reps_max,
            source_by_exercise.get(template_exercise.exercise_id),
        )

    # Anything the source ran that the template dropped goes after the plan
    template_exercise_ids = {te.exercise_id for te in workout_template.exercises}
    extra_base = (
        max((te.order_index for te in workout_template.exercises), default=-1) + 1
    ) * 100
    for offset, (exercise_id, exercise_sets) in enumerate(
        (eid, s) for eid, s in source_by_exercise.items() if eid not in template_exercise_ids
    ):
        _create_sets(
            exercise_id,
            len(exercise_sets),
            extra_base + offset * 100,
            exercise_sets[-1].target_reps,
            exercise_sets,
        )


@router.post("/", response_model=MesocycleInstanceResponse, status_code=status.HTTP_201_CREATED)
async def start_mesocycle_instance(
    instance_data: MesocycleInstanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start a new mesocycle instance from a template.

    Creates all workout sessions upfront using the optimizer volume profile.
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

    total_weeks = template.weeks
    days_per_week = template.days_per_week

    # Create instance first (need ID for sessions)
    new_instance = MesocycleInstance(
        user_id=current_user.id,
        mesocycle_template_id=instance_data.mesocycle_template_id,
        template_name=template.name,
        template_weeks=total_weeks,
        template_days_per_week=days_per_week,
        status="active",
        start_date=instance_data.start_date or date.today(),
    )

    db.add(new_instance)
    db.flush()  # Get the instance ID

    # Load workout templates sorted by order_index
    workout_templates = (
        db.query(WorkoutTemplate)
        .filter(WorkoutTemplate.mesocycle_id == template.id)
        .order_by(WorkoutTemplate.order_index)
        .all()
    )

    # Create all workout sessions
    today = instance_data.start_date or date.today()
    for week in range(1, total_weeks + 1):
        for day_idx, wt in enumerate(workout_templates):
            day_number = day_idx + 1

            session = WorkoutSession(
                user_id=current_user.id,
                mesocycle_instance_id=new_instance.id,
                workout_template_id=wt.id,
                workout_date=today,
                week_number=week,
                day_number=day_number,
                status="in_progress",
            )
            db.add(session)
            db.flush()  # Get session ID for sets

            # Week 1 with source instance: copy from source
            if (week == 1
                    and instance_data.source_instance_id is not None
                    and instance_data.source_week_number is not None):
                source_session = db.query(WorkoutSession).filter(
                    WorkoutSession.mesocycle_instance_id == instance_data.source_instance_id,
                    WorkoutSession.user_id == current_user.id,
                    WorkoutSession.week_number == instance_data.source_week_number,
                    WorkoutSession.day_number == day_number,
                ).first()

                if source_session:
                    _generate_sets_from_source(
                        db, session, wt, source_session, total_weeks,
                        current_user.id, new_instance.id, day_number,
                    )
                else:
                    # Source session not found for this day, fall back to template
                    _generate_sets_for_session(
                        db, session, wt, week, total_weeks,
                        current_user.id, new_instance.id, day_number,
                    )
            else:
                # All other weeks (or week 1 fresh start)
                _generate_sets_for_session(
                    db, session, wt, week, total_weeks,
                    current_user.id, new_instance.id, day_number,
                )

    db.commit()
    db.refresh(new_instance)

    # Load template with full details for response
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

    # Reopening an instance must not leave the user with two active blocks
    if update_data.get("status") == "active" and instance.status != "active":
        other_active = db.query(MesocycleInstance).filter(
            MesocycleInstance.user_id == current_user.id,
            MesocycleInstance.status == "active",
            MesocycleInstance.id != instance.id,
        ).first()
        if other_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an active mesocycle. End it before reopening this one.",
            )
        instance.end_date = None

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


class ExerciseNotesUpdate(BaseModel):
    """Schema for updating exercise notes on an instance."""
    workout_exercise_id: int
    notes: Optional[str] = None


@router.patch("/{instance_id}/exercise-notes")
async def update_exercise_notes(
    instance_id: int,
    data: ExerciseNotesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update exercise notes on a mesocycle instance.

    Stores per-exercise note overrides keyed by workout_exercise_id.
    If notes is empty/null, the key is removed.
    """
    instance = db.query(MesocycleInstance).filter(
        MesocycleInstance.id == instance_id
    ).first()

    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mesocycle instance not found"
        )

    if instance.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own mesocycle instances"
        )

    # Load existing notes or start fresh
    notes_dict = json.loads(instance.exercise_notes) if instance.exercise_notes else {}

    # Set or delete the key
    key = str(data.workout_exercise_id)
    if data.notes:
        notes_dict[key] = data.notes
    else:
        notes_dict.pop(key, None)

    # Save back as JSON text
    instance.exercise_notes = json.dumps(notes_dict) if notes_dict else None

    db.commit()
    db.refresh(instance)

    return notes_dict


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
