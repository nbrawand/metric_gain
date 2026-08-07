"""Mesocycle instance endpoints for starting and managing active training blocks."""

import json
from collections import OrderedDict
from typing import List, Optional
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.mesocycle import Mesocycle, MesocycleInstance, WorkoutTemplate, WorkoutExercise
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
from app.utils.db import apply_update
from app.services.progression import (
    DEFAULT_INCREMENT,
    compute_deload_sets,
    compute_deload_weight,
    is_deload_week,
    DELOAD_TARGET_RIR,
    increments_for_exercises,
    compute_sets_for_week,
    compute_target_rir,
    compute_progression_targets,
    find_previous_performance,
    find_previous_set,
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
                includes_deload=instance.includes_deload,
                total_weeks=instance.total_weeks,
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
            detail="No active mesocycle found."
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
            detail="Mesocycle not found."
        )

    # Check ownership
    if instance.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to that mesocycle.",
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

    increments = increments_for_exercises(
        db, [te.exercise_id for te in workout_template.exercises]
    )

    for template_exercise in workout_template.exercises:
        num_sets = compute_sets_for_week(
            template_exercise.target_sets,
            template_exercise.weekly_set_increment,
            week_number,
        )

        # Look up previous performance for target_weight/target_reps
        prev_set = find_previous_set(
            db, user_id, template_exercise.exercise_id,
            mesocycle_instance_id=mesocycle_instance_id,
            current_week=week_number,
            current_day=day_number,
        )
        hist_target_weight, hist_target_reps = compute_progression_targets(
            prev_set.weight if prev_set else None,
            (prev_set.reps if prev_set and prev_set.reps > 0 else None),
            template_exercise.target_reps_max,
            increment=increments.get(template_exercise.exercise_id, DEFAULT_INCREMENT),
            rep_ceiling=template_exercise.target_reps_max,
            prev_target_reps=prev_set.target_reps if prev_set else None,
            prev_rir=prev_set.rir if prev_set else None,
            prev_target_rir=prev_set.target_rir if prev_set else None,
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


def _generate_deload_sets(
    db,
    workout_session,
    workout_template,
    training_weeks,
    user_id,
    mesocycle_instance_id,
    day_number,
):
    """Generate the extra recovery week that follows the training weeks.

    Same exercises, about half the sets, a little lighter, and stopping well
    short of failure. Sized off week 1 rather than the final week on purpose:
    the last training week is the highest-volume one, and half of that is still
    a hard session.
    """
    increments = increments_for_exercises(
        db, [te.exercise_id for te in workout_template.exercises]
    )

    for template_exercise in workout_template.exercises:
        increment = increments.get(template_exercise.exercise_id, DEFAULT_INCREMENT)
        num_sets = compute_deload_sets(
            compute_sets_for_week(
                template_exercise.target_sets,
                template_exercise.weekly_set_increment,
                1,
            )
        )

        prev_set = find_previous_set(
            db, user_id, template_exercise.exercise_id,
            mesocycle_instance_id=mesocycle_instance_id,
            current_week=workout_session.week_number,
            current_day=day_number,
        )
        target_weight = compute_deload_weight(
            prev_set.weight if prev_set else None, increment
        )

        for set_num in range(1, num_sets + 1):
            db.add(
                WorkoutSet(
                    workout_session_id=workout_session.id,
                    exercise_id=template_exercise.exercise_id,
                    set_number=set_num,
                    order_index=template_exercise.order_index * 100 + set_num,
                    weight=0,
                    reps=0,
                    target_weight=target_weight,
                    target_reps=template_exercise.target_reps_min,
                    target_rir=DELOAD_TARGET_RIR,
                )
            )


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

    increments = increments_for_exercises(
        db,
        [te.exercise_id for te in workout_template.exercises]
        + [ss.exercise_id for ss in source_sets],
    )

    source_by_exercise = OrderedDict()
    for ss in source_sets:
        source_by_exercise.setdefault(ss.exercise_id, []).append(ss)

    target_rir = compute_target_rir(week_number, total_weeks)

    def _create_sets(
        exercise_id, num_sets, order_base, fallback_reps, source_exercise_sets,
        rep_ceiling=None,
    ):
        increment = increments.get(exercise_id, DEFAULT_INCREMENT)
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
            if fallback_set and fallback_set.weight > 0:
                # Progress off what was actually lifted, the same rule every
                # other set-generating path uses. Taking the source weight raw
                # gave one exercise two different targets in one session: the
                # sets the source session had stayed flat, while the sets past
                # its count fell through to the history lookup below and did
                # get the bump.
                target_weight, target_reps = compute_progression_targets(
                    fallback_set.weight,
                    fallback_set.reps if fallback_set.reps > 0 else None,
                    target_reps,
                    increment=increment,
                    rep_ceiling=rep_ceiling,
                    prev_target_reps=fallback_set.target_reps,
                    prev_rir=fallback_set.rir,
                    prev_target_rir=fallback_set.target_rir,
                )

            # Fallback to cascading lookup if source has no weight data
            if target_weight is None:
                prev_set = find_previous_set(
                    db, user_id, exercise_id,
                    mesocycle_instance_id=mesocycle_instance_id,
                    current_week=week_number,
                    current_day=day_number,
                )
                prev_reps = (
                    prev_set.reps if prev_set and prev_set.reps > 0 else None
                )
                if prev_set is not None:
                    target_weight, target_reps = compute_progression_targets(
                        prev_set.weight,
                        prev_set.reps if prev_set.reps > 0 else None,
                        target_reps,
                        increment=increment,
                        rep_ceiling=rep_ceiling,
                        prev_target_reps=prev_set.target_reps,
                        prev_rir=prev_set.rir,
                        prev_target_rir=prev_set.target_rir,
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
            rep_ceiling=template_exercise.target_reps_max,
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

    Creates every week x day workout session upfront from the template plan.
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
            detail="Mesocycle template not found."
        )

    # Allow starting from own templates or stock templates
    if template.user_id != current_user.id and not template.is_stock:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only start your own templates or stock templates."
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
        includes_deload=True,
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

    # Otherwise the user ends up with an active block containing nothing to
    # train, which also blocks them from starting any other mesocycle
    if not workout_templates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This template has no workout days. Add at least one before starting it.",
        )

    # Create all workout sessions, plus one extra week for the deload. A block
    # used to end on its hardest week and hand the next one a fully fatigued
    # lifter; the deload is where that fatigue gets paid down.
    start = instance_data.start_date or date.today()
    for week in range(1, new_instance.total_weeks + 1):
        for day_idx, wt in enumerate(workout_templates):
            day_number = day_idx + 1
            # A planned date per session rather than today's date on all of
            # them: they are listed by date, so identical dates left the order
            # up to the database.
            planned_date = start + timedelta(weeks=week - 1, days=day_idx)

            session = WorkoutSession(
                user_id=current_user.id,
                mesocycle_instance_id=new_instance.id,
                workout_template_id=wt.id,
                workout_date=planned_date,
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
            elif is_deload_week(week, total_weeks):
                _generate_deload_sets(
                    db, session, wt, total_weeks,
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
            detail="Mesocycle not found."
        )

    # Check ownership
    if instance.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only change your own mesocycles."
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

    apply_update(instance, update_data)

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
            detail="Mesocycle not found."
        )

    if instance.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only change your own mesocycles."
        )

    # The key must name an exercise in this instance's template — an arbitrary
    # id would sit in exercise_notes forever, never displayed, never removable
    # from the UI. Deletes are exempt so a note left behind by a removed
    # exercise can still be cleaned up.
    if data.notes:
        workout_exercise = (
            db.query(WorkoutExercise)
            .join(WorkoutTemplate, WorkoutExercise.workout_template_id == WorkoutTemplate.id)
            .filter(
                WorkoutExercise.id == data.workout_exercise_id,
                WorkoutTemplate.mesocycle_id == instance.mesocycle_template_id,
            )
            .first()
        )
        if not workout_exercise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="That exercise is not part of this mesocycle.",
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
