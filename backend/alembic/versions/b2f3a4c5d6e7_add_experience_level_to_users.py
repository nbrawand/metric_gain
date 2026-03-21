"""add experience_level to users

Revision ID: b2f3a4c5d6e7
Revises: 78a113184164
Create Date: 2026-03-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2f3a4c5d6e7'
down_revision = '78a113184164'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('experience_level', sa.String(20), nullable=False, server_default='intermediate'))


def downgrade() -> None:
    op.drop_column('users', 'experience_level')
