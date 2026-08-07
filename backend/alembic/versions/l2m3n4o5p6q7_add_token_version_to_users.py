"""add token_version to users

Gives the app a way to revoke already-issued JWTs. Every token carries the
version it was minted at; bumping the column invalidates all of them at once.

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
Create Date: 2026-08-06

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'l2m3n4o5p6q7'
down_revision = 'k1l2m3n4o5p6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # server_default so existing rows get 0 rather than NULL, which would fail
    # the NOT NULL constraint on a table that already has users in it
    op.add_column(
        'users',
        sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_column('users', 'token_version')
