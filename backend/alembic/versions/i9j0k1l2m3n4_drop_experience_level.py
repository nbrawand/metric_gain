"""drop experience_level from users

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-08-04

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'i9j0k1l2m3n4'
down_revision = 'h8i9j0k1l2m3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('experience_level')


def downgrade() -> None:
    op.add_column(
        'users',
        sa.Column('experience_level', sa.String(length=20), nullable=False, server_default='intermediate'),
    )
