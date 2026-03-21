"""add volume_profile to mesocycle_instances

Revision ID: c3d4e5f6a7b8
Revises: b2f3a4c5d6e7
Create Date: 2026-03-21 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'b2f3a4c5d6e7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('mesocycle_instances', sa.Column('volume_profile', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('mesocycle_instances', 'volume_profile')
