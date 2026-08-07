"""add stripe event guard columns to users

Stripe neither orders webhook deliveries nor stops retrying them for days.
Recording the id and created timestamp of the last event applied to a user's
subscription state lets the webhook drop duplicates and out-of-order stale
events instead of letting a late past_due retry overwrite a newer active.

Revision ID: m3n4o5p6q7r8
Revises: l2m3n4o5p6q7
Create Date: 2026-08-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'm3n4o5p6q7r8'
down_revision = 'l2m3n4o5p6q7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Nullable: existing users have no applied event yet, and the webhook
    # treats NULL as "apply anything"
    op.add_column('users', sa.Column('stripe_event_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('stripe_event_created', sa.BigInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'stripe_event_created')
    op.drop_column('users', 'stripe_event_id')
