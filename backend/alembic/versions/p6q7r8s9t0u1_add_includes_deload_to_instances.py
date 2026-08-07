"""add includes_deload to mesocycle_instances

Blocks now carry one extra deload week after their planned training weeks.
Recorded per instance rather than derived: blocks already in flight have no
sessions for that week, and computing it would give them a phantom final week
that can never be completed, leaving the block stuck at "active" forever.

Existing rows therefore default to false. New instances set it to true in
application code.

Revision ID: p6q7r8s9t0u1
Revises: o5p6q7r8s9t0
Create Date: 2026-08-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'p6q7r8s9t0u1'
down_revision = 'o5p6q7r8s9t0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'mesocycle_instances',
        sa.Column(
            'includes_deload',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column('mesocycle_instances', 'includes_deload')
