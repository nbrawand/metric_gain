"""API routes for workout session management."""

from typing import List
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

import math

from app.database import get_db
from app.models.workout_session import WorkoutSession, WorkoutSet, WorkoutFeedback
from app.models.exercise import Exercise
from app.models.user import User
from app.models.mesocycle import WorkoutTemplate

# Muscle group set progression configuration
# Starting sets = 2 for all muscle groups
# Growth rate per week: big muscles = 1, small muscles = 1.5
STARTING_SETS = 1
BIG_MUSCLE_GROUPS = {"Chest", "Back", "Quadriceps", "Hamstrings", "Glutes"}
SMALL_MUSCLE_GROUPS = {"Shoulders", "Biceps", "Triceps", "Calves", "Core"}


def get_sets_for_week(muscle_group: str, week_number: int, total_weeks: int = 0) -> int:
    """Calculate number of sets for a muscle group in a given week.

    Formula: sets = week * growth_rate + starting_sets
    Big muscles: growth_rate = 0.5, Small muscles: growth_rate = 1
    Deload week (last week): always 1 set per exercise
    """
    if total_weeks > 0 and week_number == total_weeks:
        return 1

    if muscle_group in BIG_MUSCLE_GROUPS:
        growth_rate = 1.0
    elif muscle_group in SMALL_MUSCLE_GROUPS:
        growth_rate = 1.5
    else:
        growth_rate = 1.0  # Default to big muscle rate

    return math.ceil(week_number * growth_rate + STARTING_SETS)
from app.schemas.workout_session import (
    WorkoutSessionCreate,
    WorkoutSessionUpdate,
    WorkoutSessionResponse,
    WorkoutSessionListResponse,
    WorkoutSetCreate,
    WorkoutSetUpdate,
    WorkoutSetResponse,
    WorkoutFeedbackCreate,
    WorkoutFeedbackResponse,
    SwapExerciseRequest,
    AddExerciseRequest,
)
from app.routers.auth import get_current_user


router = APIRouter(prefix="/workout-sessions", tags=["workout-sessions"])


def _generate_sets_from_template(db, workout_session, template, week_number, total_weeks):
    """Generate workout sets from template exercises (Branch C helper)."""
    for template_exercise in template.exercises:
        exercise = db.query(Exercise).filter(
            Exercise.id == template_exercise.exercise_id
        ).first()
        muscle_group = exercise.muscle_group if exercise else "Other"

        num_sets = get_sets_for_week(muscle_group, week_number, total_weeks)
        for set_num in range(1, num_sets + 1):
            workout_set = WorkoutSet(
                workout_session_id=workout_session.id,
                exercise_id=template_exercise.exercise_id,
                set_number=set_num,
                order_index=template_exercise.order_index * 100 + set_num,
                weight=0,
                reps=0,
                target_weight=None,
                target_reps=template_exercise.target_reps_max,
                target_rir=template_exercise.starting_rir,
            )
            db.add(workout_set)


@router.post("/", response_model=WorkoutSessionResponse, status_code=status.HTTP_201_CREATED)
def create_workout_session(
    session_data: WorkoutSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new workout session and auto-generate sets from template."""
    # Create the workout session (exclude source fields not in DB model)
    workout_session = WorkoutSession(
        user_id=current_user.id,
        **session_data.model_dump(exclude={"source_instance_id", "source_week_number"})
    )
    db.add(workout_session)
    db.flush()  # Get the session ID without committing

    # Fetch the workout template to get exercises
    template = db.query(WorkoutTemplate).filter(
        WorkoutTemplate.id == session_data.workout_template_id
    ).first()

    total_weeks = template.mesocycle.weeks if (template and template.mesocycle) else 0

    # Branch A: Week 2+ — derive exercises from most recent earlier session's actual sets
    prev_session = None
    if session_data.week_number > 1:
        prev_session = db.query(WorkoutSession).filter(
            WorkoutSession.mesocycle_instance_id == session_data.mesocycle_instance_id,
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.week_number < session_data.week_number,
            WorkoutSession.day_number == session_data.day_number,
        ).order_by(WorkoutSession.week_number.desc()).first()

    if prev_session:
        prev_sets = db.query(WorkoutSet).filter(
            WorkoutSet.workout_session_id == prev_session.id
        ).order_by(WorkoutSet.order_index, WorkoutSet.set_number).all()

        # Group by exercise_id preserving order
        from collections import OrderedDict
        exercise_groups: OrderedDict[int, list] = OrderedDict()
        for ps in prev_sets:
            exercise_groups.setdefault(ps.exercise_id, []).append(ps)

        for exercise_id, prev_exercise_sets in exercise_groups.items():
            exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
            muscle_group = exercise.muscle_group if exercise else "Other"

            expected_prev = get_sets_for_week(muscle_group, prev_session.week_number, total_weeks)
            actual_prev = len(prev_exercise_sets)
            offset = actual_prev - expected_prev

            is_deload = total_weeks > 0 and session_data.week_number == total_weeks
            if is_deload:
                num_sets = 1
            else:
                num_sets = max(1, get_sets_for_week(muscle_group, session_data.week_number, total_weeks) + offset)

            for set_num in range(1, num_sets + 1):
                # Find matching previous set for this set_number
                prev_set = next((s for s in prev_exercise_sets if s.set_number == set_num), None)
                # Fall back to last available set for targets
                fallback_set = prev_set or prev_exercise_sets[-1]

                target_weight = None
                if prev_set and prev_set.weight > 0:
                    increase = max(prev_set.weight * 0.025, 2.5)
                    target_weight = round(prev_set.weight + increase, 1)

                # Use actual reps performed in previous week, fall back to previous target
                target_reps = fallback_set.target_reps
                if prev_set and prev_set.reps > 0:
                    target_reps = prev_set.reps

                workout_set = WorkoutSet(
                    workout_session_id=workout_session.id,
                    exercise_id=exercise_id,
                    set_number=set_num,
                    order_index=fallback_set.order_index,
                    weight=0,
                    reps=0,
                    target_weight=target_weight,
                    target_reps=target_reps,
                    target_rir=fallback_set.target_rir,
                )
                db.add(workout_set)

    # Branch B: Week 1 with source instance — derive from source session
    elif (session_data.week_number == 1
            and session_data.source_instance_id is not None
            and session_data.source_week_number is not None):
        source_session = db.query(WorkoutSession).filter(
            WorkoutSession.mesocycle_instance_id == session_data.source_instance_id,
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.week_number == session_data.source_week_number,
            WorkoutSession.day_number == session_data.day_number,
        ).first()

        if source_session:
            source_sets = db.query(WorkoutSet).filter(
                WorkoutSet.workout_session_id == source_session.id
            ).order_by(WorkoutSet.order_index, WorkoutSet.set_number).all()

            from collections import OrderedDict
            exercise_groups: OrderedDict[int, list] = OrderedDict()
            for ss in source_sets:
                exercise_groups.setdefault(ss.exercise_id, []).append(ss)

            for exercise_id, source_exercise_sets in exercise_groups.items():
                exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
                muscle_group = exercise.muscle_group if exercise else "Other"
                num_sets = get_sets_for_week(muscle_group, session_data.week_number, total_weeks)

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

                    workout_set = WorkoutSet(
                        workout_session_id=workout_session.id,
                        exercise_id=exercise_id,
                        set_number=set_num,
                        order_index=fallback_set.order_index,
                        weight=0,
                        reps=0,
                        target_weight=target_weight,
                        target_reps=target_reps,
                        target_rir=fallback_set.target_rir,
                    )
                    db.add(workout_set)
        elif template and template.exercises:
            # Source session not found, fall through to template
            _generate_sets_from_template(db, workout_session, template, session_data.week_number, total_weeks)

    # Branch C: Fallback to template (week 1 fresh, or no previous session found)
    elif template and template.exercises:
        _generate_sets_from_template(db, workout_session, template, session_data.week_number, total_weeks)

    db.commit()

    # Reload with exercise data
    workout_session = db.query(WorkoutSession).options(
        joinedload(WorkoutSession.workout_sets).joinedload(WorkoutSet.exercise)
    ).filter(WorkoutSession.id == workout_session.id).first()

    return workout_session


@router.get("/", response_model=List[WorkoutSessionListResponse])
def list_workout_sessions(
    mesocycle_instance_id: int = None,
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

    if mesocycle_instance_id is not None:
        query = query.filter(WorkoutSession.mesocycle_instance_id == mesocycle_instance_id)

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
            "mesocycle_instance_id": session.mesocycle_instance_id,
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
    workout_session = db.query(WorkoutSession).options(
        joinedload(WorkoutSession.workout_sets).joinedload(WorkoutSet.exercise)
    ).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()

    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )

    # Refresh targets from previous week's actual data for in-progress sessions
    if workout_session.status == "in_progress" and workout_session.week_number > 1:
        prev_session = db.query(WorkoutSession).filter(
            WorkoutSession.mesocycle_instance_id == workout_session.mesocycle_instance_id,
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.week_number < workout_session.week_number,
            WorkoutSession.day_number == workout_session.day_number,
        ).order_by(WorkoutSession.week_number.desc()).first()

        if prev_session:
            prev_sets = db.query(WorkoutSet).filter(
                WorkoutSet.workout_session_id == prev_session.id
            ).all()
            prev_map = {}
            for ps in prev_sets:
                prev_map.setdefault(ps.exercise_id, []).append(ps)

            dirty = False
            for ws in workout_session.workout_sets:
                prev_exercise_sets = prev_map.get(ws.exercise_id)
                if not prev_exercise_sets:
                    continue
                prev_set = next((s for s in prev_exercise_sets if s.set_number == ws.set_number), None)
                if not prev_set:
                    continue

                if prev_set.reps > 0 and ws.target_reps != prev_set.reps:
                    ws.target_reps = prev_set.reps
                    dirty = True
                if prev_set.weight > 0:
                    new_target = round(prev_set.weight + max(prev_set.weight * 0.025, 2.5), 1)
                    if ws.target_weight != new_target:
                        ws.target_weight = new_target
                        dirty = True

            if dirty:
                db.commit()
                workout_session = db.query(WorkoutSession).options(
                    joinedload(WorkoutSession.workout_sets).joinedload(WorkoutSet.exercise)
                ).filter(WorkoutSession.id == session_id).first()

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


# Exercise Management endpoints (mid-workout swap/remove/add)

def _get_session_or_404(db, session_id: int, current_user: User) -> WorkoutSession:
    """Get a workout session, verifying ownership. Raises 404 if not found."""
    workout_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id,
    ).first()
    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found",
        )
    return workout_session


def _reject_if_completed(workout_session: WorkoutSession):
    """Raise 400 if the session is already completed."""
    if workout_session.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify a completed session",
        )


def _reload_session(db, session_id: int) -> WorkoutSession:
    """Reload a session with exercise data for response."""
    return db.query(WorkoutSession).options(
        joinedload(WorkoutSession.workout_sets).joinedload(WorkoutSet.exercise)
    ).filter(WorkoutSession.id == session_id).first()


@router.post("/{session_id}/exercises/swap", response_model=WorkoutSessionResponse)
def swap_exercise(
    session_id: int,
    request: SwapExerciseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Swap one exercise for another in a workout session."""
    workout_session = _get_session_or_404(db, session_id, current_user)
    _reject_if_completed(workout_session)

    # Verify new exercise exists
    new_exercise = db.query(Exercise).filter(Exercise.id == request.new_exercise_id).first()
    if not new_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="New exercise not found",
        )

    # Find all sets for the old exercise
    old_sets = db.query(WorkoutSet).filter(
        WorkoutSet.workout_session_id == session_id,
        WorkoutSet.exercise_id == request.old_exercise_id,
    ).all()

    if not old_sets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Old exercise not found in this session",
        )

    # Update all sets: swap exercise, reset performance data
    for ws in old_sets:
        ws.exercise_id = request.new_exercise_id
        ws.weight = 0
        ws.reps = 0
        ws.target_weight = None
        ws.skipped = 0

    db.commit()
    return _reload_session(db, session_id)


@router.delete("/{session_id}/exercises/{exercise_id}", response_model=WorkoutSessionResponse)
def remove_exercise(
    session_id: int,
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove all sets for an exercise from a workout session."""
    workout_session = _get_session_or_404(db, session_id, current_user)
    _reject_if_completed(workout_session)

    deleted_count = db.query(WorkoutSet).filter(
        WorkoutSet.workout_session_id == session_id,
        WorkoutSet.exercise_id == exercise_id,
    ).delete()

    if deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this session",
        )

    db.commit()
    return _reload_session(db, session_id)


@router.post("/{session_id}/exercises/add", response_model=WorkoutSessionResponse)
def add_exercise(
    session_id: int,
    request: AddExerciseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new exercise to a workout session."""
    workout_session = _get_session_or_404(db, session_id, current_user)
    _reject_if_completed(workout_session)

    # Verify exercise exists
    exercise = db.query(Exercise).filter(Exercise.id == request.exercise_id).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )

    # Reject if exercise already in session
    existing = db.query(WorkoutSet).filter(
        WorkoutSet.workout_session_id == session_id,
        WorkoutSet.exercise_id == request.exercise_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exercise already exists in this session",
        )

    # Determine order_index: max existing + 100
    max_order = db.query(func.max(WorkoutSet.order_index)).filter(
        WorkoutSet.workout_session_id == session_id
    ).scalar() or 0
    new_order_index = max_order + 100

    # Calculate number of sets
    template = db.query(WorkoutTemplate).filter(
        WorkoutTemplate.id == workout_session.workout_template_id
    ).first()
    total_weeks = template.mesocycle.weeks if (template and template.mesocycle) else 0
    num_sets = get_sets_for_week(exercise.muscle_group, workout_session.week_number, total_weeks)

    for set_num in range(1, num_sets + 1):
        workout_set = WorkoutSet(
            workout_session_id=session_id,
            exercise_id=request.exercise_id,
            set_number=set_num,
            order_index=new_order_index,
            weight=0,
            reps=0,
            target_weight=None,
            target_reps=None,
            target_rir=3,
        )
        db.add(workout_set)

    db.commit()
    return _reload_session(db, session_id)


# Per-exercise set add/remove endpoints

@router.post(
    "/{session_id}/exercises/{exercise_id}/sets",
    response_model=WorkoutSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_set_to_exercise(
    session_id: int,
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a set to a specific exercise in a workout session."""
    workout_session = _get_session_or_404(db, session_id, current_user)
    _reject_if_completed(workout_session)

    existing_sets = (
        db.query(WorkoutSet)
        .filter(
            WorkoutSet.workout_session_id == session_id,
            WorkoutSet.exercise_id == exercise_id,
        )
        .order_by(WorkoutSet.set_number.desc())
        .all()
    )

    if not existing_sets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this session",
        )

    last_set = existing_sets[0]
    new_set = WorkoutSet(
        workout_session_id=session_id,
        exercise_id=exercise_id,
        set_number=last_set.set_number + 1,
        order_index=last_set.order_index,
        weight=0,
        reps=0,
        target_weight=None,
        target_reps=last_set.target_reps,
        target_rir=last_set.target_rir,
    )
    db.add(new_set)
    db.commit()
    return _reload_session(db, session_id)


@router.delete(
    "/{session_id}/exercises/{exercise_id}/sets",
    response_model=WorkoutSessionResponse,
)
def remove_set_from_exercise(
    session_id: int,
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove the last set from a specific exercise in a workout session."""
    workout_session = _get_session_or_404(db, session_id, current_user)
    _reject_if_completed(workout_session)

    existing_sets = (
        db.query(WorkoutSet)
        .filter(
            WorkoutSet.workout_session_id == session_id,
            WorkoutSet.exercise_id == exercise_id,
        )
        .order_by(WorkoutSet.set_number.desc())
        .all()
    )

    if not existing_sets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this session",
        )

    if len(existing_sets) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the last set",
        )

    db.delete(existing_sets[0])
    db.commit()
    return _reload_session(db, session_id)


# Workout Feedback endpoints
@router.post("/{session_id}/feedback", response_model=List[WorkoutFeedbackResponse], status_code=status.HTTP_201_CREATED)
def submit_workout_feedback(
    session_id: int,
    feedback_data: WorkoutFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit muscle group difficulty feedback for a workout session."""
    workout_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()

    if not workout_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout session not found"
        )

    # Delete any existing feedback for this session (allow re-submission)
    db.query(WorkoutFeedback).filter(
        WorkoutFeedback.workout_session_id == session_id
    ).delete()

    # Create new feedback entries
    created = []
    for item in feedback_data.feedback:
        fb = WorkoutFeedback(
            workout_session_id=session_id,
            muscle_group=item.muscle_group,
            difficulty=item.difficulty,
        )
        db.add(fb)
        created.append(fb)

    db.commit()
    for fb in created:
        db.refresh(fb)

    return created
