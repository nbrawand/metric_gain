"""add autoregulate_volume to mesocycles

The volume mode was only choosable when starting a block, so the create form
presented a per-exercise weekly increment that autoregulation then ignored, and
a review chart showing a ramp that would not happen. The template now carries
the default, chosen alongside the increments it governs.

Defaults to true, matching what starting a block already did. This is only a
default for a control — running blocks are governed by their own instance flag
and are unaffected.

Revision ID: r8s9t0u1v2w3
Revises: q7r8s9t0u1v2
Create Date: 2026-08-07

"""
from alembic import op
import sqlalchemy as sa


revision = 'r8s9t0u1v2w3'
down_revision = 'q7r8s9t0u1v2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'mesocycles',
        sa.Column(
            'autoregulate_volume', sa.Boolean(), nullable=False,
            server_default=sa.true(),
        ),
    )


def downgrade() -> None:
    op.drop_column('mesocycles', 'autoregulate_volume')
