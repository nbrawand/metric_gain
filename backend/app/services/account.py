"""Exporting and deleting an account's data.

Both of these were promised in the privacy policy before they existed, and the
policy said in writing that they were handled by email. This is what makes the
button honest.

Kept out of the router because the shape of an export is a data question, not
an HTTP one, and because deletion has an ordering constraint worth stating
once: billing has to be closed before the row that names the customer goes.
"""

import logging
from typing import Any, Dict

from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.mesocycle import (
    Mesocycle,
    MesocycleInstance,
    WorkoutTemplate,
    WorkoutExercise,
)
from app.models.user import User
from app.models.workout_session import WorkoutSession, WorkoutSet

logger = logging.getLogger(__name__)


def _iso(value):
    """Dates and datetimes as ISO strings, everything else untouched."""
    return value.isoformat() if hasattr(value, "isoformat") else value


def _row(obj, *, skip=()) -> Dict[str, Any]:
    """Every mapped column on a row, as plain JSON-safe values.

    Column-driven rather than a hand-written field list on purpose: a column
    added later lands in the export automatically. An export that silently
    omits a new field is worse than one that includes something dull, because
    the omission is invisible to whoever added the column.
    """
    return {
        column.key: _iso(getattr(obj, column.key))
        for column in obj.__table__.columns
        if column.key not in skip
    }


def export_account(db: Session, user: User) -> Dict[str, Any]:
    """Everything we hold about this user, as one JSON-safe dict.

    Stock templates and the stock exercise library are deliberately absent.
    They are the same for everybody, they are not personal data, and including
    them would bury the user's own rows in several hundred lines of ours.
    """
    templates = (
        db.query(Mesocycle)
        .filter(Mesocycle.user_id == user.id)
        .order_by(Mesocycle.id)
        .all()
    )
    template_ids = [t.id for t in templates]

    workouts = (
        db.query(WorkoutTemplate)
        .filter(WorkoutTemplate.mesocycle_id.in_(template_ids))
        .order_by(WorkoutTemplate.id)
        .all()
        if template_ids
        else []
    )
    workout_ids = [w.id for w in workouts]

    workout_exercises = (
        db.query(WorkoutExercise)
        .filter(WorkoutExercise.workout_template_id.in_(workout_ids))
        .order_by(WorkoutExercise.id)
        .all()
        if workout_ids
        else []
    )

    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == user.id)
        .order_by(WorkoutSession.workout_date, WorkoutSession.id)
        .all()
    )
    session_ids = [s.id for s in sessions]

    sets = (
        db.query(WorkoutSet)
        .filter(WorkoutSet.workout_session_id.in_(session_ids))
        .order_by(
            WorkoutSet.workout_session_id,
            WorkoutSet.order_index,
            WorkoutSet.set_number,
        )
        .all()
        if session_ids
        else []
    )

    return {
        "export_version": 1,
        # Named so a reader knows what the numbers in `sets` mean without
        # having to find the preference that governs them
        "note": (
            "Weights are in the unit stored on the account at export time, "
            "see profile.preferences."
        ),
        "profile": _row(user),
        "custom_exercises": [
            _row(e)
            for e in db.query(Exercise)
            .filter(Exercise.user_id == user.id)
            .order_by(Exercise.id)
            .all()
        ],
        "mesocycle_templates": [_row(t) for t in templates],
        "workout_templates": [_row(w) for w in workouts],
        "workout_exercises": [_row(x) for x in workout_exercises],
        "mesocycle_instances": [
            _row(i)
            for i in db.query(MesocycleInstance)
            .filter(MesocycleInstance.user_id == user.id)
            .order_by(MesocycleInstance.id)
            .all()
        ],
        "workout_sessions": [_row(s) for s in sessions],
        "workout_sets": [_row(s) for s in sets],
    }


def delete_account(db: Session, user: User) -> None:
    """Delete the user row and let the cascades take the training data.

    Every user-owned table is ON DELETE CASCADE, so this one delete reaches
    custom exercises, templates, instances, sessions and sets. `admin_audit_log`
    is deliberately ON DELETE SET NULL and survives: it records what an
    administrator did to an account, and a deletion request from the account
    is not a reason to lose the record of that.

    Billing is closed by the caller before this runs. Once the row is gone the
    stripe customer id is gone with it, and a live subscription nobody can
    trace back to a person keeps charging a card.
    """
    email = user.email
    db.delete(user)
    db.commit()
    logger.info("Deleted account and all training data for user=%s", email)
