"""Set-count and target progression helpers.

Set counts are fully user-driven: each WorkoutExercise stores a starting set
count (target_sets) and a weekly increment (weekly_set_increment) chosen at
mesocycle creation. Sessions stick to this plan for the whole mesocycle.
"""

from typing import Optional, Tuple

from sqlalchemy.orm import Session


# Smallest weight change that is actually loadable, by equipment. Matched as
# lowercase substrings against Exercise.equipment, which is freeform text and
# often a combination ("Barbell/Dumbbells", "Cable Machine/Band"), so the first
# match wins and order matters: the finer increment is listed first, because a
# combination is only as fine as its finest option.
#
# Everything in a commercial gym lands on 5 lb — the smallest plate pair is
# 2 x 2.5, dumbbells step in 5s, and selectorised stacks in 5s or 10s. The
# exceptions are lifts loaded by a single plate or by adding weight to
# bodyweight, where a lone 2.5 is loadable.
DEFAULT_INCREMENT = 5.0
_EQUIPMENT_INCREMENTS = (
    ("bodyweight", 2.5),
    ("pull-up bar", 2.5),
    ("parallel bars", 2.5),
    ("plate", 2.5),
    ("ab wheel", 2.5),
    ("medicine ball", 2.5),
    ("band", 2.5),
    ("other", 2.5),
)


def increment_for_equipment(equipment: Optional[str]) -> float:
    """The smallest weight step this equipment can actually be loaded with."""
    if not equipment:
        return DEFAULT_INCREMENT
    text = equipment.lower()
    for keyword, increment in _EQUIPMENT_INCREMENTS:
        if keyword in text:
            return increment
    return DEFAULT_INCREMENT


def round_to_increment(value: float, increment: float) -> float:
    """Round a weight to the nearest loadable step, halves up.

    Half-up matters: a target landing exactly between two steps would go back
    down under Python's banker's rounding and stall the weight forever.
    """
    if increment <= 0:
        return value
    rounded = int(value / increment + 0.5) * increment
    # 2.5 * 41 style products carry float noise; weights are never finer than
    # a tenth of a pound
    return round(rounded, 2)


def round_to_nearest_5(value: float) -> float:
    """Round a weight to the nearest 5 (e.g. 0, 5, 10, 15, ...), halves up."""
    return round_to_increment(value, 5.0)


def increments_for_exercises(db: Session, exercise_ids) -> dict:
    """Map exercise id -> loadable increment, in one query.

    Batched because set generation runs per exercise per day per week; looking
    equipment up one row at a time turned starting a 6x6 block into hundreds of
    extra round trips.
    """
    from app.models.exercise import Exercise

    ids = {i for i in exercise_ids if i is not None}
    if not ids:
        return {}
    rows = (
        db.query(Exercise.id, Exercise.equipment)
        .filter(Exercise.id.in_(ids))
        .all()
    )
    return {row[0]: increment_for_equipment(row[1]) for row in rows}


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


WEEKLY_INCREASE = 0.025


def compute_progression_targets(
    prev_weight: Optional[float],
    prev_reps: Optional[int],
    fallback_reps: Optional[int],
    increment: float = DEFAULT_INCREMENT,
    rep_ceiling: Optional[int] = None,
) -> Tuple[Optional[float], Optional[int]]:
    """Progressive-overload targets from the last performance.

    Aim for +2.5%, rounded to the nearest step the equipment can be loaded
    with. When the percentage is too small to move a full step, hold the weight
    and ask for one more rep instead — double progression — until reps reach the
    top of the range, at which point the weight goes up one step and reps reset.

    There used to be a `min 2.5` floor under the percentage, which made every
    jump a full +5 lb no matter the lift: 15 -> 20 is +33% and unachievable
    week after week, while 225 -> 230 is +2.2%. That is backwards, and the
    floor is what caused it — the percentage is the driver, the increment is
    only the resolution it gets rounded to.

    Returns (target_weight, target_reps).
    """
    target_weight = None
    target_reps = fallback_reps

    if prev_weight is not None:
        target_weight = round_to_increment(
            prev_weight * (1 + WEEKLY_INCREASE), increment
        )

        if target_weight > prev_weight:
            # The percentage cleared a full step: take the weight, hold reps
            if prev_reps is not None:
                target_reps = prev_reps
        else:
            # Too small to move a step. Add a rep instead, and once the rep
            # range is exhausted convert that progress into the next step up.
            target_weight = prev_weight
            current_reps = prev_reps if prev_reps is not None else target_reps
            if current_reps is not None:
                if rep_ceiling is not None and current_reps >= rep_ceiling:
                    target_weight = round_to_increment(
                        prev_weight + increment, increment
                    )
                    # Hold at the top of the range rather than continuing to
                    # climb: asking for more reps *and* more weight in the same
                    # week is two progressions at once. This is the only place a
                    # light lift takes a large percentage jump, and it happens
                    # once the rep range is exhausted rather than every week.
                    target_reps = rep_ceiling
                else:
                    target_reps = current_reps + 1
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
