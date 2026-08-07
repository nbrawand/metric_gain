"""Small helpers shared by the routers for talking to the database."""

from sqlalchemy import inspect


def apply_update(instance, update_data: dict) -> None:
    """Apply a partial update, ignoring an explicit null on a NOT NULL column.

    Every Optional field on an update schema accepts null as a *set* value, so
    a body like {"weight": null} passes validation and would otherwise write
    NULL into a NOT NULL column — an IntegrityError the client sees as a 500.
    Nullable columns are still clearable, which is how notes and rir get reset.
    """
    columns = inspect(type(instance)).columns
    for field, value in update_data.items():
        if value is None:
            column = columns.get(field)
            if column is not None and not column.nullable:
                continue
        setattr(instance, field, value)
