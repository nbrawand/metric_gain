"""API routes for workout session management."""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models.workout_session import WorkoutSession, WorkoutSet
from app.models.exercise import Exercise
from app.models.user import User
from app.models.mesocycle import WorkoutTemplate
from app.services.progression import (
    compute_sets_for_week,
    compute_target_rir,
    compute_progression_targets,
    find_previous_performance,
)

from app.schemas.workout_session import (
    WorkoutSessionUpdate,
    WorkoutSessionResponse,
    WorkoutSessionListResponse,
    WorkoutSetCreate,
    WorkoutSetUpdate,
    WorkoutSetResponse,
    SwapExerciseRequest,
    AddExerciseRequest,
)
from app.routers.auth import get_current_user


router = APIRouter(prefix="/workout-sessions", tags=["workout-sessions"])


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

    # week/day break ties so paging is stable even when sessions share a date
    sessions_with_counts = query.order_by(
        WorkoutSession.workout_date.desc(),
        WorkoutSession.week_number.asc(),
        WorkoutSession.day_number.asc(),
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

    # Refresh targets from previous data for in-progress sessions
    if workout_session.status == "in_progress":
        # Try per-set matching from previous week first (preserves per-set weight differences)
        prev_map = {}
        prev_session = None
        if workout_session.week_number > 1:
            # Only a session that was actually performed: an untouched or
            # skipped week has zero-weight sets, and matching it froze every
            # later week's targets at the value they were seeded with.
            prev_session = db.query(WorkoutSession).filter(
                WorkoutSession.mesocycle_instance_id == workout_session.mesocycle_instance_id,
                WorkoutSession.user_id == current_user.id,
                WorkoutSession.status == "completed",
                WorkoutSession.week_number < workout_session.week_number,
                WorkoutSession.day_number == workout_session.day_number,
            ).order_by(WorkoutSession.week_number.desc()).first()

            if prev_session:
                prev_sets = db.query(WorkoutSet).filter(
                    WorkoutSet.workout_session_id == prev_session.id
                ).all()
                for ps in prev_sets:
                    prev_map.setdefault(ps.exercise_id, []).append(ps)

        dirty = False
        for ws in workout_session.workout_sets:
            prev_exercise_sets = prev_map.get(ws.exercise_id)
            prev_set = None
            if prev_exercise_sets:
                prev_set = next((s for s in prev_exercise_sets if s.set_number == ws.set_number), None)

            if prev_set and prev_set.weight > 0:
                # Per-set progression from the same set last week
                new_target, new_reps = compute_progression_targets(
                    prev_set.weight,
                    prev_set.reps if prev_set.reps > 0 else None,
                    ws.target_reps,
                )
            elif ws.target_weight is None or prev_session is not None:
                # No matching set last week. This is the normal case for the
                # sets the weekly increment adds — they have no counterpart in
                # the previous week but were seeded with an old target, which
                # left them showing a far lighter weight than their siblings.
                hist_weight, hist_reps = find_previous_performance(
                    db, current_user.id, ws.exercise_id,
                    mesocycle_instance_id=workout_session.mesocycle_instance_id,
                    current_week=workout_session.week_number,
                    current_day=workout_session.day_number,
                )
                new_target, new_reps = compute_progression_targets(
                    hist_weight, hist_reps, ws.target_reps
                )
            else:
                continue

            if new_target is not None and ws.target_weight != new_target:
                ws.target_weight = new_target
                dirty = True
            if new_reps is not None and ws.target_reps != new_reps:
                ws.target_reps = new_reps
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

    # Timestamp completion, and clear it if the session is reopened so that
    # "most recently completed" ordering stays truthful
    if update_data.get("status") == "completed":
        if not workout_session.completed_at:
            workout_session.completed_at = datetime.now(timezone.utc)
    elif update_data.get("status") is not None:
        workout_session.completed_at = None

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

    _reject_if_completed(workout_session)

    # Without this the insert fails the foreign key on Postgres and surfaces as
    # a 500 instead of a 404
    exercise = db.query(Exercise).filter(Exercise.id == set_data.exercise_id).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
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

    # Deleting a set changes the shape of a finished workout. Editing one is
    # deliberately still allowed: the offline queue can only replay weight and
    # reps, and it may well drain after the session was completed.
    _reject_if_completed(workout_session)

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

    # Merging into an exercise already in the session would give it two runs of
    # set numbers, which corrupts set add/remove and next week's target matching
    if request.new_exercise_id != request.old_exercise_id:
        already_present = db.query(WorkoutSet).filter(
            WorkoutSet.workout_session_id == session_id,
            WorkoutSet.exercise_id == request.new_exercise_id,
        ).first()
        if already_present:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That exercise is already in this session",
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

    # Update all sets: swap exercise, reset performance data. Everything the
    # user recorded about the old lift has to go, including the RIR they rated
    # it at and any note — otherwise the new exercise comes back carrying a
    # rating for a set that was never performed on it.
    for ws in old_sets:
        ws.exercise_id = request.new_exercise_id
        ws.weight = 0
        ws.reps = 0
        ws.rir = None
        ws.notes = None
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
            detail="That exercise is already in this session",
        )

    # Determine order_index: max existing + 100
    max_order = db.query(func.max(WorkoutSet.order_index)).filter(
        WorkoutSet.workout_session_id == session_id
    ).scalar() or 0
    new_order_index = max_order + 100

    # Set count from the template plan if this exercise is in it; default 3
    template = db.query(WorkoutTemplate).filter(
        WorkoutTemplate.id == workout_session.workout_template_id
    ).first()
    total_weeks = template.mesocycle.weeks if (template and template.mesocycle) else 0

    num_sets = 3
    target_rir = 3
    if template:
        planned_entries = [
            te for te in template.exercises if te.exercise_id == request.exercise_id
        ]
        if planned_entries:
            num_sets = sum(
                compute_sets_for_week(
                    te.target_sets, te.weekly_set_increment, workout_session.week_number
                )
                for te in planned_entries
            )
    if total_weeks:
        target_rir = compute_target_rir(workout_session.week_number, total_weeks)

    # Seed targets from history like every other set-generating path, so an
    # exercise added mid-block isn't the only one that starts with no guidance
    prev_weight, prev_reps = find_previous_performance(
        db, current_user.id, request.exercise_id,
        mesocycle_instance_id=workout_session.mesocycle_instance_id,
        current_week=workout_session.week_number,
        current_day=workout_session.day_number,
    )
    target_weight, target_reps = compute_progression_targets(prev_weight, prev_reps, None)

    for set_num in range(1, num_sets + 1):
        workout_set = WorkoutSet(
            workout_session_id=session_id,
            exercise_id=request.exercise_id,
            set_number=set_num,
            order_index=new_order_index,
            weight=0,
            reps=0,
            target_weight=target_weight,
            target_reps=target_reps,
            target_rir=target_rir,
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
        # Carry the whole target across, not just reps — an extra set of the
        # same exercise has the same target as the ones beside it
        target_weight=last_set.target_weight,
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
