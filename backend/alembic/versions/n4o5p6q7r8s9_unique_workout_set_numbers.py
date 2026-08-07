"""unique set numbers per exercise per session

The routers guard set numbering with check-then-insert, which concurrent or
retried requests can slip past. Duplicate set numbers corrupt set add/remove
and next week's per-set target matching, so the database has to hold the line.

Existing duplicates (from races before this constraint) are renumbered to the
next free number in their group rather than deleted, since they may hold real
logged work.

Revision ID: n4o5p6q7r8s9
Revises: m3n4o5p6q7r8
Create Date: 2026-08-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'n4o5p6q7r8s9'
down_revision = 'm3n4o5p6q7r8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Renumber any colliding rows: earlier id keeps its number, later ids get
    # the next free number within their (session, exercise) group
    rows = conn.execute(sa.text(
        "SELECT id, workout_session_id, exercise_id, set_number "
        "FROM workout_sets "
        "ORDER BY workout_session_id, exercise_id, set_number, id"
    )).fetchall()

    used: dict[tuple[int, int], set[int]] = {}
    for row_id, session_id, exercise_id, set_number in rows:
        group = used.setdefault((session_id, exercise_id), set())
        if set_number in group:
            new_number = max(group) + 1
            conn.execute(
                sa.text("UPDATE workout_sets SET set_number = :n WHERE id = :id"),
                {"n": new_number, "id": row_id},
            )
            group.add(new_number)
        else:
            group.add(set_number)

    # batch_alter_table so this also works on SQLite, which cannot add a
    # constraint to an existing table in place
    with op.batch_alter_table('workout_sets') as batch_op:
        batch_op.create_unique_constraint(
            'uq_workout_set_number',
            ['workout_session_id', 'exercise_id', 'set_number'],
        )


def downgrade() -> None:
    with op.batch_alter_table('workout_sets') as batch_op:
        batch_op.drop_constraint('uq_workout_set_number', type_='unique')
