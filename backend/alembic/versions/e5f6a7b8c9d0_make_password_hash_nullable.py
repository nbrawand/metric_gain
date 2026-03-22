"""make password_hash nullable

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-03-21

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('users', 'password_hash',
                    existing_type=sa.String(255),
                    nullable=True)


def downgrade() -> None:
    op.alter_column('users', 'password_hash',
                    existing_type=sa.String(255),
                    nullable=False)
