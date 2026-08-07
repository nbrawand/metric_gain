"""Reading back the training history the app already stores.

Every set ever logged carries weight, reps and RIR, and none of it was ever
shown to the lifter. These helpers turn those rows into the three questions
people actually ask: am I getting stronger, how much work am I doing, and what
are my best lifts.
"""

from collections import defaultdict
from typing import Dict, List, Optional

from sqlalchemy.orm import Session


def estimate_one_rep_max(
    weight: float, reps: int, rir: Optional[int] = None
) -> Optional[float]:
    """Epley 1RM estimate, using reps-to-failure rather than reps performed.

    A set stopped at 2 RIR had two more reps in it, and ignoring that would
    make a deliberately submaximal set look like a strength regression against
    a set taken to failure at the same weight. Where RIR was not recorded the
    set is treated as if it were taken to failure, which is the conservative
    reading, it can only understate the estimate.

    Returns None for anything unusable rather than a misleading zero.
    """
    if not weight or weight <= 0 or reps is None or reps <= 0:
        return None
    effective_reps = reps + (rir or 0)
    # Epley is unreliable far past ~12 reps; clamping keeps a 30-rep set of
    # calf raises from claiming a 2x bodyweight max
    effective_reps = min(effective_reps, 12)
    return round(weight * (1 + effective_reps / 30), 1)


def _completed_sets_query(db: Session, user_id: int):
    """Every set the user actually performed, newest last."""
    from app.models.workout_session import WorkoutSession, WorkoutSet

    return (
        db.query(WorkoutSet, WorkoutSession)
        .join(WorkoutSession, WorkoutSession.id == WorkoutSet.workout_session_id)
        .filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == "completed",
            WorkoutSet.weight > 0,
            WorkoutSet.reps > 0,
            WorkoutSet.skipped == 0,
        )
        .order_by(WorkoutSession.workout_date, WorkoutSet.set_number)
    )


def strength_over_time(
    db: Session, user_id: int, exercise_id: int
) -> List[dict]:
    """Best estimated 1RM per session for one exercise, oldest first.

    Per session rather than per set: a session's top set is the honest
    representation of that day, and plotting every set turns the line into
    noise from back-off work.
    """
    from app.models.workout_session import WorkoutSet

    rows = (
        _completed_sets_query(db, user_id)
        .filter(WorkoutSet.exercise_id == exercise_id)
        .all()
    )

    best_by_session: Dict[int, dict] = {}
    for workout_set, session in rows:
        estimate = estimate_one_rep_max(
            workout_set.weight, workout_set.reps, workout_set.rir
        )
        if estimate is None:
            continue
        existing = best_by_session.get(session.id)
        if existing is None or estimate > existing["estimated_1rm"]:
            best_by_session[session.id] = {
                "date": session.workout_date.isoformat(),
                "estimated_1rm": estimate,
                "weight": workout_set.weight,
                "reps": workout_set.reps,
                "rir": workout_set.rir,
            }

    return sorted(best_by_session.values(), key=lambda point: point["date"])


def weekly_volume_by_muscle_group(
    db: Session, user_id: int, weeks: int = 12
) -> dict:
    """Hard sets per muscle group per calendar week, oldest first.

    Counted in sets rather than tonnage: sets per muscle per week is the unit
    training volume is actually programmed in, and tonnage flatters whoever
    trains the heaviest lifts.
    """
    from app.models.exercise import Exercise
    from app.models.workout_session import WorkoutSet

    rows = (
        _completed_sets_query(db, user_id)
        .add_entity(Exercise)
        .join(Exercise, Exercise.id == WorkoutSet.exercise_id)
        .all()
    )

    by_week: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for workout_set, session, exercise in rows:
        # ISO week start (Monday) keys the buckets, so weeks line up across
        # blocks that started on different days
        week_start = session.workout_date.fromordinal(
            session.workout_date.toordinal() - session.workout_date.weekday()
        )
        by_week[week_start.isoformat()][exercise.muscle_group or "Other"] += 1

    ordered = sorted(by_week.keys())[-weeks:]
    groups = sorted({g for week in ordered for g in by_week[week]})
    return {
        "weeks": ordered,
        "muscle_groups": groups,
        "sets": {g: [by_week[w].get(g, 0) for w in ordered] for g in groups},
    }


def personal_records(db: Session, user_id: int) -> List[dict]:
    """Best estimated 1RM and heaviest set per exercise, strongest first."""
    from app.models.exercise import Exercise
    from app.models.workout_session import WorkoutSet

    rows = (
        _completed_sets_query(db, user_id)
        .add_entity(Exercise)
        .join(Exercise, Exercise.id == WorkoutSet.exercise_id)
        .all()
    )

    best: Dict[int, dict] = {}
    for workout_set, session, exercise in rows:
        estimate = estimate_one_rep_max(
            workout_set.weight, workout_set.reps, workout_set.rir
        )
        record = best.setdefault(
            exercise.id,
            {
                "exercise_id": exercise.id,
                "exercise_name": exercise.name,
                "muscle_group": exercise.muscle_group,
                "best_estimated_1rm": None,
                "best_estimated_1rm_date": None,
                "heaviest_weight": None,
                "heaviest_weight_reps": None,
                "heaviest_weight_date": None,
            },
        )
        if estimate is not None and (
            record["best_estimated_1rm"] is None
            or estimate > record["best_estimated_1rm"]
        ):
            record["best_estimated_1rm"] = estimate
            record["best_estimated_1rm_date"] = session.workout_date.isoformat()
        if (
            record["heaviest_weight"] is None
            or workout_set.weight > record["heaviest_weight"]
        ):
            record["heaviest_weight"] = workout_set.weight
            record["heaviest_weight_reps"] = workout_set.reps
            record["heaviest_weight_date"] = session.workout_date.isoformat()

    return sorted(
        best.values(),
        key=lambda r: r["best_estimated_1rm"] or 0,
        reverse=True,
    )


def training_overview(db: Session, user_id: int) -> dict:
    """Headline totals: sessions, sets, and blocks finished."""
    from app.models.mesocycle import MesocycleInstance
    from app.models.workout_session import WorkoutSession

    sessions_completed = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == "completed",
        )
        .count()
    )
    sets_logged = _completed_sets_query(db, user_id).count()
    blocks_completed = (
        db.query(MesocycleInstance)
        .filter(
            MesocycleInstance.user_id == user_id,
            MesocycleInstance.status == "completed",
        )
        .count()
    )

    rows = _completed_sets_query(db, user_id).all()
    total_reps = sum(ws.reps for ws, _ in rows)
    # Tonnage is a weak measure of training but a satisfying one to see, and
    # it is the only figure here that uses the weight the lifter actually moved
    total_volume = round(sum(ws.weight * ws.reps for ws, _ in rows), 1)
    first_date = rows[0][1].workout_date.isoformat() if rows else None

    return {
        "sessions_completed": sessions_completed,
        "sets_logged": sets_logged,
        "blocks_completed": blocks_completed,
        "total_reps": total_reps,
        "total_volume": total_volume,
        "training_since": first_date,
    }
