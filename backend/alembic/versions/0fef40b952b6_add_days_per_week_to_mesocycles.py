"""add_days_per_week_to_mesocycles

Revision ID: 0fef40b952b6
Revises: 26003ace4a6c
Create Date: 2026-01-21 20:54:58.634295

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0fef40b952b6'
down_revision = '26003ace4a6c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add days_per_week column to mesocycles table
    op.add_column('mesocycles', sa.Column('days_per_week', sa.Integer(), nullable=False, server_default='4'))
    # Remove server_default after adding (we want the default in the model, not in DB)
    op.alter_column('mesocycles', 'days_per_week', server_default=None)


def downgrade() -> None:
    # Remove days_per_week column
    op.drop_column('mesocycles', 'days_per_week')
