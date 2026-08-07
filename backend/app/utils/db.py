"""Small helpers shared by the routers for talking to the database."""

import json

from sqlalchemy import inspect


def apply_update(instance, update_data: dict) -> None:
    """Apply a partial update, ignoring an explicit null on a NOT NULL column.

    Every Optional field on an update schema accepts null as a *set* value, so
    a body like {"weight": null} passes validation and would otherwise write
    NULL into a NOT NULL column, an IntegrityError the client sees as a 500.
    Nullable columns are still clearable, which is how notes and rir get reset.
    """
    columns = inspect(type(instance)).columns
    for field, value in update_data.items():
        if value is None:
            column = columns.get(field)
            if column is not None and not column.nullable:
                continue
        setattr(instance, field, value)


def user_weight_unit(user) -> str:
    """The unit this user logs in, read from their preferences JSON.

    Weights are stored as the number the lifter typed, so this is what says
    which unit that number is in, and therefore which steps a target may be
    rounded to. Anything unparseable falls back to pounds.
    """
    from app.services.progression import normalize_unit

    raw = getattr(user, "preferences", None)
    if not raw:
        return normalize_unit(None)
    try:
        return normalize_unit(json.loads(raw).get("weight_unit"))
    except (ValueError, TypeError, AttributeError):
        return normalize_unit(None)
