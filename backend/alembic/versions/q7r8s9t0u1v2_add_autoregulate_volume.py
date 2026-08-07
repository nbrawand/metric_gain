"""add autoregulate_volume to mesocycle_instances

Set counts now respond to logged performance rather than replaying the weekly
increment chosen at creation.

Stored per instance rather than as a global setting: blocks already running
were generated with the ramp baked into every week, so switching them to
autoregulation midway would fight those pre-computed counts. Existing rows
default to false and finish on the plan they started with.

Revision ID: q7r8s9t0u1v2
Revises: p6q7r8s9t0u1
Create Date: 2026-08-07

"""
from alembic import op
import sqlalchemy as sa


revision = 'q7r8s9t0u1v2'
down_revision = 'p6q7r8s9t0u1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'mesocycle_instances',
        sa.Column(
            'autoregulate_volume',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column('mesocycle_instances', 'autoregulate_volume')
