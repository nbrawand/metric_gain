"""Set-count and target progression helpers.

Set counts are fully user-driven: each WorkoutExercise stores a starting set
count (target_sets) and a weekly increment (weekly_set_increment) chosen at
mesocycle creation. Sessions stick to this plan for the whole mesocycle.
"""

from typing import Optional, Tuple

from sqlalchemy.orm import Session


def round_to_nearest_5(value: float) -> float:
    """Round a weight to the nearest 5 (e.g. 0, 5, 10, 15, ...), halves up.

    Half-up matters: a +2.5 bump on any weight ending in 0 lands exactly on a
    half step, and Python's banker's rounding would send it back down, stalling
    the weight target forever (100 -> 102.5 -> 100).
    """
    return int(value / 5 + 0.5) * 5


def compute_sets_for_week(target_sets: int, increment: float, week: int) -> int:
    """Sets for week N = round_half_up(target_sets + increment * (N - 1)), min 1.

    Uses int(x + 0.5) rather than round() so .5 always rounds up, matching
    Math.round in the frontend preview charts.
    """
    return max(1, int(target_sets + increment * (week - 1) + 0.5))


def compute_target_rir(week: int, total_weeks: int) -> int:
    """Target RIR ramps from 3 (week 1) down to 0 (final week).

    Formula: round_half_up(3 * (total_weeks - week) / (total_weeks - 1)).
    Half-up (not Python's banker's rounding) so the ramp matches Math.round in
    the frontend, as with compute_sets_for_week.
    """
    if total_weeks <= 1:
        return 0
    # Clamped because a week outside the block would otherwise produce a
    # negative RIR, which the response schema rejects once it is stored.
    return max(0, min(3, int(3 * (total_weeks - week) / (total_weeks - 1) + 0.5)))


def compute_progression_targets(
    prev_weight: Optional[float],
    prev_reps: Optional[int],
    fallback_reps: Optional[int],
) -> Tuple[Optional[float], Optional[int]]:
    """Progressive-overload targets from the last performance.

    Aim for +2.5% weight (min 2.5) rounded to the nearest 5; if rounding
    doesn't move the weight, keep it and target one more rep instead.
    Returns (target_weight, target_reps).
    """
    target_weight = None
    target_reps = fallback_reps
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
    elif prev_reps is not None:
        target_reps = prev_reps
    return target_weight, target_reps


def find_previous_performance(
    db: Session,
    user_id: int,
    exercise_id: int,
    mesocycle_instance_id: Optional[int] = None,
    current_week: Optional[int] = None,
    current_day: Optional[int] = None,
) -> Tuple[Optional[float], Optional[int]]:
    """Find the last completed non-zero weight/reps for an exercise.

    Search priority:
      1. Previous week, same day, same meso instance
      2. Any completed session in the same meso instance
      3. Any completed session across all meso instances

    Returns (weight, reps) or (None, None).
    """
    from app.models.workout_session import WorkoutSession, WorkoutSet

    # Tier 1: Previous week, same day, same meso instance
    if mesocycle_instance_id and current_week and current_week > 1 and current_day:
        result = (
            db.query(WorkoutSet)
            .join(WorkoutSession, WorkoutSession.id == WorkoutSet.workout_session_id)
            .filter(
                WorkoutSession.user_id == user_id,
                WorkoutSession.mesocycle_instance_id == mesocycle_instance_id,
                WorkoutSession.status == "completed",
                WorkoutSession.week_number < current_week,
                WorkoutSession.day_number == current_day,
                WorkoutSet.exercise_id == exercise_id,
                WorkoutSet.weight > 0,
            )
            .order_by(
                WorkoutSession.week_number.desc(),
                WorkoutSet.set_number.asc(),
            )
            .first()
        )
        if result:
            return (result.weight, result.reps if result.reps > 0 else None)

    # Tier 2: Any completed session in the same meso instance
    if mesocycle_instance_id:
        result = (
            db.query(WorkoutSet)
            .join(WorkoutSession, WorkoutSession.id == WorkoutSet.workout_session_id)
            .filter(
                WorkoutSession.user_id == user_id,
                WorkoutSession.mesocycle_instance_id == mesocycle_instance_id,
                WorkoutSession.status == "completed",
                WorkoutSet.exercise_id == exercise_id,
                WorkoutSet.weight > 0,
            )
            .order_by(
                WorkoutSession.week_number.desc(),
                WorkoutSet.set_number.asc(),
            )
            .first()
        )
        if result:
            return (result.weight, result.reps if result.reps > 0 else None)

    # Tier 3: Any completed session across all meso instances
    result = (
        db.query(WorkoutSet)
        .join(WorkoutSession, WorkoutSession.id == WorkoutSet.workout_session_id)
        .filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == "completed",
            WorkoutSet.exercise_id == exercise_id,
            WorkoutSet.weight > 0,
        )
        .order_by(
            WorkoutSession.completed_at.desc(),
            WorkoutSet.set_number.asc(),
        )
        .first()
    )
    if result:
        return (result.weight, result.reps if result.reps > 0 else None)

    return (None, None)
