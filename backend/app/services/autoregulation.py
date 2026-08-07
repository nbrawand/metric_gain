"""Volume autoregulation driven by logged performance.

Set counts used to be decided once, at creation: pick a weekly increment and
replay it for the whole block regardless of how training actually went. Every
set already records what it was asked for and what was achieved, which is
enough to decide next week's volume with no extra input from the lifter.

The rule is deliberately blunt, because the signal is noisy:

    every set hit its target   -> one more set next week
    one set missed             -> hold
    most sets missed           -> one fewer set next week

Volume is capped per *muscle group* rather than per exercise. Recovery happens
per muscle: three chest exercises each creeping up by one set is nine extra
chest sets a week, and no per-exercise limit would notice.
"""

from typing import Dict, Iterable, List, Optional

from sqlalchemy.orm import Session

from app.services.progression import evaluate_last_performance

# Weekly set ceilings per muscle group, roughly where the published maximum
# recoverable volume ranges top out for an intermediate lifter.
#
# MUST match WEEKLY_SET_CEILINGS in frontend/src/utils/volume.ts. The frontend
# draws these on the planning chart; this module enforces them while a block
# runs, and the two disagreeing would mean the app warns about one number and
# then holds you to a different one.
MUSCLE_GROUP_WEEKLY_SET_CEILINGS: Dict[str, int] = {
    "Chest": 22,
    "Back": 25,
    "Shoulders": 26,
    "Biceps": 20,
    "Triceps": 18,
    "Quadriceps": 20,
    "Hamstrings": 16,
    "Glutes": 16,
    "Calves": 20,
    "Core": 25,
    "Forearms": 15,
    "Traps": 20,
}
DEFAULT_WEEKLY_SET_CEILING = 25

# An exercise never drops below this, whatever the lifter logs. Falling to zero
# would quietly delete the exercise from the rest of the block.
MIN_SETS_PER_EXERCISE = 1


def ceiling_for_muscle_group(muscle_group: Optional[str]) -> int:
    if not muscle_group:
        return DEFAULT_WEEKLY_SET_CEILING
    return MUSCLE_GROUP_WEEKLY_SET_CEILINGS.get(
        muscle_group, DEFAULT_WEEKLY_SET_CEILING
    )


def score_exercise_performance(sets: Iterable) -> int:
    """How next week's set count should move for one exercise: +1, 0 or -1.

    A set that was skipped, or left blank on a session marked complete, is not
    a hit — the work was not done, so volume has not earned the right to grow.
    Sets with no target at all cannot be judged and are ignored, which is what
    keeps history recorded before targets existed from reading as failure.
    """
    judged = [s for s in sets if s.target_reps is not None]
    if not judged:
        return 0

    misses = 0
    for workout_set in judged:
        if workout_set.skipped:
            misses += 1
            continue
        outcome = evaluate_last_performance(
            workout_set.reps,
            workout_set.target_reps,
            workout_set.rir,
            workout_set.target_rir,
        )
        if outcome != "hit":
            misses += 1

    if misses == 0:
        return 1
    # "Most" rather than "any": one bad set in five is a bad set, not a signal
    # that the whole exercise is beyond recovery
    if misses * 2 > len(judged):
        return -1
    return 0


def _muscle_groups_for(db: Session, exercise_ids) -> Dict[int, str]:
    from app.models.exercise import Exercise

    ids = {i for i in exercise_ids if i is not None}
    if not ids:
        return {}
    rows = db.query(Exercise.id, Exercise.muscle_group).filter(Exercise.id.in_(ids)).all()
    return {row[0]: row[1] for row in rows}


def _weekly_sets_by_muscle_group(
    db: Session, instance_id: int, week_number: int, user_id: int
) -> Dict[str, int]:
    """Total planned sets per muscle group across every day of one week."""
    from app.models.workout_session import WorkoutSession, WorkoutSet

    rows = (
        db.query(WorkoutSet.exercise_id)
        .join(WorkoutSession, WorkoutSession.id == WorkoutSet.workout_session_id)
        .filter(
            WorkoutSession.mesocycle_instance_id == instance_id,
            WorkoutSession.user_id == user_id,
            WorkoutSession.week_number == week_number,
        )
        .all()
    )
    groups = _muscle_groups_for(db, [r[0] for r in rows])

    totals: Dict[str, int] = {}
    for (exercise_id,) in rows:
        group = groups.get(exercise_id) or "Other"
        totals[group] = totals.get(group, 0) + 1
    return totals


class VolumeAdjustment:
    """One exercise's set-count change, for reporting back to the lifter."""

    def __init__(self, exercise_id: int, delta: int, from_sets: int, to_sets: int,
                 capped: bool = False):
        self.exercise_id = exercise_id
        self.delta = delta
        self.from_sets = from_sets
        self.to_sets = to_sets
        self.capped = capped

    def as_dict(self) -> dict:
        return {
            "exercise_id": self.exercise_id,
            "delta": self.delta,
            "from_sets": self.from_sets,
            "to_sets": self.to_sets,
            "capped": self.capped,
        }


def autoregulate_next_week(db: Session, completed_session) -> List[VolumeAdjustment]:
    """Resize next week's copy of this day based on how this session went.

    Only the immediately following week is touched. Later weeks are adjusted in
    turn as their predecessor is completed, so a single bad session cannot
    reshape the rest of the block.
    """
    from app.models.workout_session import WorkoutSession, WorkoutSet

    instance = completed_session.mesocycle_instance
    if instance is None or not instance.autoregulate_volume:
        return []

    training_weeks = instance.template_weeks or 0
    next_week = completed_session.week_number + 1
    # The deload week is prescribed recovery, not a place to add volume
    if training_weeks and next_week > training_weeks:
        return []

    next_session = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.mesocycle_instance_id == completed_session.mesocycle_instance_id,
            WorkoutSession.user_id == completed_session.user_id,
            WorkoutSession.day_number == completed_session.day_number,
            WorkoutSession.week_number == next_week,
            WorkoutSession.status != "completed",
        )
        .first()
    )
    if next_session is None:
        return []

    completed_sets = (
        db.query(WorkoutSet)
        .filter(WorkoutSet.workout_session_id == completed_session.id)
        .all()
    )
    by_exercise: Dict[int, list] = {}
    for workout_set in completed_sets:
        by_exercise.setdefault(workout_set.exercise_id, []).append(workout_set)

    weekly_totals = _weekly_sets_by_muscle_group(
        db, completed_session.mesocycle_instance_id, next_week, completed_session.user_id
    )
    groups = _muscle_groups_for(db, by_exercise.keys())

    adjustments: List[VolumeAdjustment] = []

    for exercise_id, sets in by_exercise.items():
        delta = score_exercise_performance(sets)
        if delta == 0:
            continue

        next_sets = (
            db.query(WorkoutSet)
            .filter(
                WorkoutSet.workout_session_id == next_session.id,
                WorkoutSet.exercise_id == exercise_id,
            )
            .order_by(WorkoutSet.set_number)
            .all()
        )
        if not next_sets:
            # Swapped or removed for next week; nothing to resize
            continue

        current = len(next_sets)
        group = groups.get(exercise_id) or "Other"
        capped = False

        if delta > 0:
            ceiling = ceiling_for_muscle_group(group)
            if weekly_totals.get(group, 0) + 1 > ceiling:
                # Earned the set, but the muscle is already at its weekly limit
                adjustments.append(
                    VolumeAdjustment(exercise_id, 0, current, current, capped=True)
                )
                continue
            template = next_sets[-1]
            db.add(
                WorkoutSet(
                    workout_session_id=next_session.id,
                    exercise_id=exercise_id,
                    set_number=template.set_number + 1,
                    order_index=template.order_index,
                    weight=0,
                    reps=0,
                    target_weight=template.target_weight,
                    target_reps=template.target_reps,
                    target_rir=template.target_rir,
                )
            )
            weekly_totals[group] = weekly_totals.get(group, 0) + 1
            adjustments.append(
                VolumeAdjustment(exercise_id, 1, current, current + 1, capped)
            )
        else:
            if current <= MIN_SETS_PER_EXERCISE:
                continue
            db.delete(next_sets[-1])
            weekly_totals[group] = max(0, weekly_totals.get(group, 0) - 1)
            adjustments.append(
                VolumeAdjustment(exercise_id, -1, current, current - 1, capped)
            )

    return adjustments
