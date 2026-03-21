"""Mesocycle instance endpoints for starting and managing active training blocks."""

import json
import logging
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
from app.services.volume_prescription import (
    build_mesocycle_config,
    get_prescribed_sets,
    compute_target_rir,
    find_previous_performance,
    round_to_nearest_5,
)
from app.services.volume_optimizer import create_mesocycle_volume, ensure_user_muscle_params, create_mesocycle_volume_for_params

logger = logging.getLogger(__name__)

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
    config,
    user_id,
    mesocycle_instance_id,
    day_number,
    is_deload=False,
):
    """Generate workout sets from a template for a given session.

    For deload weeks: 1 set per exercise at 8 RIR, no weight target.
    For training weeks: uses volume prescription per muscle group.
    """
    # Gather exercise info and count per muscle group
    exercise_info = []
    mg_exercise_count = OrderedDict()

    for template_exercise in workout_template.exercises:
        exercise = db.query(Exercise).filter(
            Exercise.id == template_exercise.exercise_id
        ).first()
        muscle_group = exercise.muscle_group if exercise else "Other"
        exercise_info.append((template_exercise, exercise, muscle_group))
        mg_exercise_count[muscle_group] = mg_exercise_count.get(muscle_group, 0) + 1

    if is_deload:
        # Deload: 1 set per exercise, 8 RIR, no weight target
        for template_exercise, exercise, muscle_group in exercise_info:
            workout_set = WorkoutSet(
                workout_session_id=workout_session.id,
                exercise_id=template_exercise.exercise_id,
                set_number=1,
                order_index=template_exercise.order_index * 100 + 1,
                weight=0,
                reps=0,
                target_weight=None,
                target_reps=template_exercise.target_reps_max,
                target_rir=8,
            )
            db.add(workout_set)
        return

    # Training week: prescribe sets per muscle group
    mg_total_sets = {}
    mg_target_rir = {}
    for mg, count in mg_exercise_count.items():
        total = get_prescribed_sets(
            db, mg, week_number, day_number,
            user_id, mesocycle_instance_id, config,
        )
        rir = compute_target_rir(week_number, config.accumulation_weeks)
        mg_total_sets[mg] = max(total, count)
        mg_target_rir[mg] = rir

    # Distribute sets to exercises
    mg_exercise_index = {}
    for template_exercise, exercise, muscle_group in exercise_info:
        n_exercises = mg_exercise_count[muscle_group]
        total = mg_total_sets[muscle_group]
        base = total // n_exercises
        remainder = total % n_exercises

        idx = mg_exercise_index.get(muscle_group, 0)
        num_sets = base + (1 if idx < remainder else 0)
        num_sets = max(num_sets, 1)
        mg_exercise_index[muscle_group] = idx + 1

        target_rir = mg_target_rir[muscle_group]

        # Look up previous performance for target_weight/target_reps
        prev_weight, prev_reps = find_previous_performance(
            db, user_id, template_exercise.exercise_id,
            mesocycle_instance_id=mesocycle_instance_id,
            current_week=week_number,
            current_day=day_number,
        )
        hist_target_weight = None
        hist_target_reps = template_exercise.target_reps_max
        if prev_weight is not None:
            increase = max(prev_weight * 0.025, 2.5)
            hist_target_weight = round_to_nearest_5(prev_weight + increase)
            if hist_target_weight <= prev_weight:
                hist_target_weight = prev_weight
                if prev_reps is not None:
                    hist_target_reps = prev_reps + 1
                elif hist_target_reps is not None:
                    hist_target_reps = hist_target_reps + 1
            elif prev_reps is not None:
                hist_target_reps = prev_reps
        elif prev_reps is not None:
            hist_target_reps = prev_reps

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
    config,
    user_id,
    mesocycle_instance_id,
    day_number,
    week_number=1,
):
    """Generate sets for week 1 by copying from a source session (previous instance).

    Uses source session's actual weights/reps as targets.
    """
    source_sets = db.query(WorkoutSet).filter(
        WorkoutSet.workout_session_id == source_session.id
    ).order_by(WorkoutSet.order_index, WorkoutSet.set_number).all()

    exercise_groups = OrderedDict()
    for ss in source_sets:
        exercise_groups.setdefault(ss.exercise_id, []).append(ss)

    target_rir = compute_target_rir(week_number, config.accumulation_weeks)

    # Resolve muscle groups
    mg_exercise_ids = OrderedDict()
    for exercise_id in exercise_groups:
        exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
        mg = exercise.muscle_group if exercise else "Other"
        mg_exercise_ids.setdefault(mg, []).append(exercise_id)

    # Prescribe per muscle group
    exercise_set_counts = {}
    for mg, ex_ids in mg_exercise_ids.items():
        total = max(len(ex_ids), get_prescribed_sets(
            db, mg, week_number, day_number,
            user_id, mesocycle_instance_id, config,
        ))
        base = total // len(ex_ids)
        remainder = total % len(ex_ids)
        for i, eid in enumerate(ex_ids):
            exercise_set_counts[eid] = max(1, base + (1 if i < remainder else 0))

    # Create sets from source
    for exercise_id, source_exercise_sets in exercise_groups.items():
        num_sets = exercise_set_counts[exercise_id]
        for set_num in range(1, num_sets + 1):
            source_set = next((s for s in source_exercise_sets if s.set_number == set_num), None)
            fallback_set = source_set or source_exercise_sets[-1]

            target_weight = None
            target_reps = fallback_set.target_reps
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
                    increase = max(prev_weight * 0.025, 2.5)
                    target_weight = round_to_nearest_5(prev_weight + increase)
                    if target_weight <= prev_weight:
                        target_weight = prev_weight
                        if prev_reps is not None:
                            target_reps = prev_reps + 1
                        elif target_reps is not None:
                            target_reps = target_reps + 1
                    elif prev_reps is not None:
                        target_reps = prev_reps
                elif prev_reps is not None and target_reps is None:
                    target_reps = prev_reps

            workout_set = WorkoutSet(
                workout_session_id=workout_session.id,
                exercise_id=exercise_id,
                set_number=set_num,
                order_index=fallback_set.order_index,
                weight=0,
                reps=0,
                target_weight=target_weight,
                target_reps=target_reps,
                target_rir=target_rir,
            )
            db.add(workout_set)


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

    # Build mesocycle config with per-muscle-group optimization
    config = build_mesocycle_config(
        db, template.id, total_weeks, days_per_week,
        experience_level=current_user.experience_level,
        user=current_user,
    )

    # Store the per-muscle volume profile on the instance
    new_instance.volume_profile = json.dumps(config.volume_profile) if config.volume_profile else None

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
        is_deload = (week == total_weeks)
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
                        db, session, wt, source_session, config,
                        current_user.id, new_instance.id, day_number,
                    )
                else:
                    # Source session not found for this day, fall back to template
                    _generate_sets_for_session(
                        db, session, wt, week, config,
                        current_user.id, new_instance.id, day_number,
                        is_deload=is_deload,
                    )
            else:
                # All other weeks (or week 1 fresh start)
                _generate_sets_for_session(
                    db, session, wt, week, config,
                    current_user.id, new_instance.id, day_number,
                    is_deload=is_deload,
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
