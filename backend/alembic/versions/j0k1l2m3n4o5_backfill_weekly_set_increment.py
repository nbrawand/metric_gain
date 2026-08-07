"""backfill weekly_set_increment to 0.5 on existing templates

Templates created before user-driven set progression had no increment, and
their target_sets were placeholders the old volume optimizer ignored. Left at
the column default of 0 they would generate flat plans with no weekly ramp, so
give every one of them the same +0.5/week default new exercises get.

Revision ID: j0k1l2m3n4o5
Revises: i9j0k1l2m3n4
Create Date: 2026-08-06

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'j0k1l2m3n4o5'
down_revision = 'i9j0k1l2m3n4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE workout_exercises SET weekly_set_increment = 0.5 "
        "WHERE weekly_set_increment = 0"
    )


def downgrade() -> None:
    # Deliberately not reversed: backfilled rows are indistinguishable from
    # templates a user set to 0.5 themselves.
    pass
