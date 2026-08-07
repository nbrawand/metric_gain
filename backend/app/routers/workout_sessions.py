"""API routes for workout session management."""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.workout_session import WorkoutSession, WorkoutSet
from app.models.exercise import Exercise
from app.models.user import User
from app.models.mesocycle import WorkoutExercise, WorkoutTemplate
from app.services.progression import (
    LB,
    DEFAULT_INCREMENT,
    increment_for_equipment,
    is_deload_week,
    compute_deload_sets,
    compute_deload_weight,
    compute_sets_for_week,
    compute_target_rir,
    compute_progression_targets,
    find_previous_performance,
    find_previous_set,
)

from app.schemas.workout_session import (
    WorkoutSessionUpdate,
    WorkoutSessionResponse,
    WorkoutSessionListResponse,
    WorkoutSetUpdate,
    WorkoutSetResponse,
    SwapExerciseRequest,
    AddExerciseRequest,
)
from app.utils.auth import get_current_user
from app.utils.db import apply_update, user_weight_unit
from app.services.autoregulation import autoregulate_next_week


router = APIRouter(prefix="/workout-sessions", tags=["workout-sessions"])


@router.get("/", response_model=List[WorkoutSessionListResponse])
def list_workout_sessions(
    mesocycle_instance_id: int = None,
    status_filter: str = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
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
            detail="Workout not found."
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

        # A deload week must not be progressed. The refresh path recomputes
        # targets for every in-progress session, so without this the recovery
        # week quietly climbed back above the training weeks.
        unit = user_weight_unit(current_user)
        _, training_weeks = _plan_context(db, workout_session)
        deload = is_deload_week(workout_session.week_number, training_weeks)

        # The plan's rep range is the ceiling double progression works up to;
        # without it a held weight would keep asking for one more rep forever
        rep_ceilings = {}
        if workout_session.workout_template_id:
            planned = db.query(WorkoutExercise).filter(
                WorkoutExercise.workout_template_id == workout_session.workout_template_id
            ).all()
            rep_ceilings = {pe.exercise_id: pe.target_reps_max for pe in planned}

        dirty = False
        for ws in workout_session.workout_sets:
            # ws.exercise is already joined-loaded, so this costs no query
            increment = increment_for_equipment(
                ws.exercise.equipment if ws.exercise else None, unit
            )
            rep_ceiling = rep_ceilings.get(ws.exercise_id)
            prev_exercise_sets = prev_map.get(ws.exercise_id)
            prev_set = None
            if prev_exercise_sets:
                prev_set = next((s for s in prev_exercise_sets if s.set_number == ws.set_number), None)

            if deload:
                hist = find_previous_set(
                    db, current_user.id, ws.exercise_id,
                    mesocycle_instance_id=workout_session.mesocycle_instance_id,
                    current_week=workout_session.week_number,
                    current_day=workout_session.day_number,
                )
                new_target = compute_deload_weight(
                    hist.weight if hist else None, increment
                )
                new_reps = None
            elif prev_set and prev_set.weight > 0:
                # Per-set progression from the same set last week
                new_target, new_reps = compute_progression_targets(
                    prev_set.weight,
                    prev_set.reps if prev_set.reps > 0 else None,
                    ws.target_reps,
                    increment=increment,
                    rep_ceiling=rep_ceiling,
                    prev_target_reps=prev_set.target_reps,
                    prev_rir=prev_set.rir,
                    prev_target_rir=prev_set.target_rir,
                )
            elif ws.target_weight is None or prev_session is not None:
                # No matching set last week. This is the normal case for the
                # sets the weekly increment adds — they have no counterpart in
                # the previous week but were seeded with an old target, which
                # left them showing a far lighter weight than their siblings.
                hist_set = find_previous_set(
                    db, current_user.id, ws.exercise_id,
                    mesocycle_instance_id=workout_session.mesocycle_instance_id,
                    current_week=workout_session.week_number,
                    current_day=workout_session.day_number,
                )
                new_target, new_reps = compute_progression_targets(
                    hist_set.weight if hist_set else None,
                    (hist_set.reps if hist_set and hist_set.reps > 0 else None),
                    ws.target_reps,
                    increment=increment,
                    rep_ceiling=rep_ceiling,
                    prev_target_reps=hist_set.target_reps if hist_set else None,
                    prev_rir=hist_set.rir if hist_set else None,
                    prev_target_rir=hist_set.target_rir if hist_set else None,
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
            detail="Workout not found."
        )

    update_data = session_update.model_dump(exclude_unset=True)
    apply_update(workout_session, update_data)

    # Timestamp completion, and clear it if the session is reopened so that
    # "most recently completed" ordering stays truthful
    adjustments = []
    if update_data.get("status") == "completed":
        if not workout_session.completed_at:
            workout_session.completed_at = datetime.now(timezone.utc)
        # Resize next week off what was just logged. Done here rather than when
        # next week is opened so the lifter is told now, while the session they
        # just finished is still the thing on their mind.
        adjustments = autoregulate_next_week(db, workout_session)
    elif update_data.get("status") is not None:
        workout_session.completed_at = None

    db.commit()
    db.refresh(workout_session)
    workout_session.volume_adjustments = [a.as_dict() for a in adjustments]
    return workout_session


# Workout Set endpoints
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
            detail="Workout not found."
        )

    workout_set = db.query(WorkoutSet).filter(
        WorkoutSet.id == set_id,
        WorkoutSet.workout_session_id == session_id
    ).first()

    if not workout_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Set not found."
        )

    apply_update(workout_set, set_update.model_dump(exclude_unset=True))

    db.commit()
    db.refresh(workout_set)
    return workout_set


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
            detail="Workout not found.",
        )
    return workout_session


def _get_exercise_or_404(db, exercise_id: int, current_user: User, label: str) -> Exercise:
    """Get an exercise, rejecting another user's custom lift.

    Without the ownership half of this check, dropping someone else's private
    exercise id into a session echoed its full name and description back in the
    response — the same leak GET /v1/exercises/{id} already refuses.
    """
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{label} not found.",
        )
    if exercise.is_custom and exercise.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to that exercise.",
        )
    return exercise


def _reject_if_completed(workout_session: WorkoutSession):
    """Raise 400 if the session is already completed."""
    if workout_session.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This workout is already finished. Reopen it to make changes.",
        )


def _reload_session(db, session_id: int) -> WorkoutSession:
    """Reload a session with exercise data for response."""
    return db.query(WorkoutSession).options(
        joinedload(WorkoutSession.workout_sets).joinedload(WorkoutSet.exercise)
    ).filter(WorkoutSession.id == session_id).first()


# Changing the exercises in one workout is nearly always a decision about the
# block, not about today: a machine is broken, a movement hurts, a substitute
# works better. Sessions for the whole block are created up front, so without
# these the same edit had to be repeated every week.


def _with_future_count(workout_session: WorkoutSession, count: int) -> WorkoutSession:
    """Attach how many later weeks the change reached, for the response.

    Not a column — just an attribute the response schema reads, so the client
    can say "applied to the next 4 weeks" instead of changing them silently.
    """
    workout_session.future_sessions_updated = count
    return workout_session


def _future_sessions_same_day(db, workout_session: WorkoutSession) -> List[WorkoutSession]:
    """Later weeks of this same training day, in this same block.

    Completed sessions are deliberately excluded. They are the record of what
    was actually performed, and editing them would rewrite history rather than
    change a plan.
    """
    return (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.mesocycle_instance_id == workout_session.mesocycle_instance_id,
            WorkoutSession.user_id == workout_session.user_id,
            WorkoutSession.day_number == workout_session.day_number,
            WorkoutSession.week_number > workout_session.week_number,
            WorkoutSession.status != "completed",
        )
        .order_by(WorkoutSession.week_number)
        .all()
    )


def _has_logged_work(db, session_id: int, exercise_id: int) -> bool:
    """True if anything was recorded against this exercise in this session.

    A future week is normally untouched, but someone can jump ahead and log
    into it. Propagation must never delete or blank work that was performed.
    """
    return (
        db.query(WorkoutSet)
        .filter(
            WorkoutSet.workout_session_id == session_id,
            WorkoutSet.exercise_id == exercise_id,
            or_(WorkoutSet.weight > 0, WorkoutSet.reps > 0, WorkoutSet.skipped == 1),
        )
        .first()
        is not None
    )


def _session_exercise_ids(db, session_id: int) -> set:
    rows = (
        db.query(WorkoutSet.exercise_id)
        .filter(WorkoutSet.workout_session_id == session_id)
        .distinct()
        .all()
    )
    return {r[0] for r in rows}


def _plan_context(db, workout_session: WorkoutSession):
    """The template and block length behind a session, for set-count maths."""
    template = (
        db.query(WorkoutTemplate)
        .filter(WorkoutTemplate.id == workout_session.workout_template_id)
        .first()
    )
    total_weeks = template.mesocycle.weeks if (template and template.mesocycle) else 0
    if not total_weeks and workout_session.mesocycle_instance:
        # The template can be deleted mid-block, which nulls workout_template_id
        total_weeks = workout_session.mesocycle_instance.template_weeks or 0
    return template, total_weeks


def _add_exercise_sets(
    db,
    workout_session: WorkoutSession,
    exercise_id: int,
    template,
    total_weeks: int,
    user_id: int,
    unit: str = LB,
) -> None:
    """Create this exercise's sets for one session, sized for that session's week."""
    max_order = (
        db.query(func.max(WorkoutSet.order_index))
        .filter(WorkoutSet.workout_session_id == workout_session.id)
        .scalar()
        or 0
    )
    new_order_index = max_order + 100

    deload = is_deload_week(workout_session.week_number, total_weeks)

    num_sets = 3
    target_rir = 3
    planned_entries = []
    if template:
        planned_entries = [
            te for te in template.exercises if te.exercise_id == exercise_id
        ]
        if planned_entries:
            # Per week, so a propagated exercise still follows the plan's ramp
            # rather than being frozen at the set count of the week it was added.
            # The deload week is sized off week 1 and then halved — following
            # the ramp into it would land the recovery week on the block's
            # highest set count.
            num_sets = sum(
                compute_sets_for_week(
                    te.target_sets,
                    te.weekly_set_increment,
                    1 if deload else workout_session.week_number,
                )
                for te in planned_entries
            )
    if deload:
        num_sets = compute_deload_sets(num_sets)
    if total_weeks:
        target_rir = compute_target_rir(workout_session.week_number, total_weeks)

    prev_weight, prev_reps = find_previous_performance(
        db, user_id, exercise_id,
        mesocycle_instance_id=workout_session.mesocycle_instance_id,
        current_week=workout_session.week_number,
        current_day=workout_session.day_number,
    )
    fallback_reps = planned_entries[0].target_reps_max if planned_entries else None
    exercise_row = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    increment = increment_for_equipment(
        exercise_row.equipment if exercise_row else None, unit
    )
    if deload:
        target_weight = compute_deload_weight(prev_weight, increment)
        target_reps = (
            planned_entries[0].target_reps_min if planned_entries else fallback_reps
        )
    else:
        target_weight, target_reps = compute_progression_targets(
            prev_weight, prev_reps, fallback_reps,
            increment=increment,
            rep_ceiling=fallback_reps,
        )

    for set_num in range(1, num_sets + 1):
        db.add(
            WorkoutSet(
                workout_session_id=workout_session.id,
                exercise_id=exercise_id,
                set_number=set_num,
                order_index=new_order_index,
                weight=0,
                reps=0,
                target_weight=target_weight,
                target_reps=target_reps,
                target_rir=target_rir,
            )
        )


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

    _get_exercise_or_404(db, request.new_exercise_id, current_user, "New exercise")

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
                detail="That exercise is already in this workout.",
            )

    # Find all sets for the old exercise
    old_sets = db.query(WorkoutSet).filter(
        WorkoutSet.workout_session_id == session_id,
        WorkoutSet.exercise_id == request.old_exercise_id,
    ).all()

    if not old_sets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="That exercise isn't in this workout.",
        )

    # Update all sets: swap exercise, reset performance data. Everything the
    # user recorded about the old lift has to go, including the RIR they rated
    # it at and any note — otherwise the new exercise comes back carrying a
    # rating for a set that was never performed on it.
    def _apply_swap(sets):
        for ws in sets:
            ws.exercise_id = request.new_exercise_id
            ws.weight = 0
            ws.reps = 0
            ws.rir = None
            ws.notes = None
            ws.target_weight = None
            # The old lift's rep target goes too — 5-rep deadlift guidance on a
            # swapped-in crunch would stick for the whole block, since the
            # refresh only replaces it once the new exercise has history
            ws.target_reps = None
            ws.skipped = 0

    _apply_swap(old_sets)

    # Carry the swap into the rest of the block
    updated = 0
    if request.new_exercise_id != request.old_exercise_id:
        for future in _future_sessions_same_day(db, workout_session):
            present = _session_exercise_ids(db, future.id)
            if request.old_exercise_id not in present:
                continue
            # Swapping onto an exercise already there would give it two runs of
            # set numbers, the same collision the check above rejects
            if request.new_exercise_id in present:
                continue
            if _has_logged_work(db, future.id, request.old_exercise_id):
                continue
            _apply_swap(
                db.query(WorkoutSet)
                .filter(
                    WorkoutSet.workout_session_id == future.id,
                    WorkoutSet.exercise_id == request.old_exercise_id,
                )
                .all()
            )
            updated += 1

    db.commit()
    return _with_future_count(_reload_session(db, session_id), updated)


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
            detail="That exercise isn't in this workout.",
        )

    # Drop it from the rest of the block too, but never from a week someone has
    # already logged into — that would delete work they performed
    updated = 0
    for future in _future_sessions_same_day(db, workout_session):
        if _has_logged_work(db, future.id, exercise_id):
            continue
        removed = (
            db.query(WorkoutSet)
            .filter(
                WorkoutSet.workout_session_id == future.id,
                WorkoutSet.exercise_id == exercise_id,
            )
            .delete()
        )
        if removed:
            updated += 1

    db.commit()
    return _with_future_count(_reload_session(db, session_id), updated)


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

    _get_exercise_or_404(db, request.exercise_id, current_user, "Exercise")

    # Reject if exercise already in session
    existing = db.query(WorkoutSet).filter(
        WorkoutSet.workout_session_id == session_id,
        WorkoutSet.exercise_id == request.exercise_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That exercise is already in this workout.",
        )

    # Seeded targets, set count and RIR all come from the shared helper, which
    # sizes each session for its own week
    template, total_weeks = _plan_context(db, workout_session)
    unit = user_weight_unit(current_user)
    _add_exercise_sets(
        db, workout_session, request.exercise_id, template, total_weeks,
        current_user.id, unit,
    )

    # Add it to the rest of the block as well
    updated = 0
    for future in _future_sessions_same_day(db, workout_session):
        if request.exercise_id in _session_exercise_ids(db, future.id):
            continue
        _add_exercise_sets(
            db, future, request.exercise_id, template, total_weeks,
            current_user.id, unit,
        )
        updated += 1

    try:
        db.commit()
    except IntegrityError:
        # A concurrent or retried add slipped past the SELECT guard above;
        # the unique constraint on set numbers is what actually caught it
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That exercise was just added to this workout. Refresh to see it.",
        )
    return _with_future_count(_reload_session(db, session_id), updated)


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
            detail="That exercise isn't in this workout.",
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
    try:
        db.commit()
    except IntegrityError:
        # Two concurrent adds both computed last_set + 1; the unique
        # constraint on set numbers rejected the second
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A set was just added to this exercise. Refresh to see it.",
        )
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
            detail="That exercise isn't in this workout.",
        )

    if len(existing_sets) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An exercise needs at least one set. Remove the exercise instead.",
        )

    db.delete(existing_sets[0])
    db.commit()
    return _reload_session(db, session_id)
