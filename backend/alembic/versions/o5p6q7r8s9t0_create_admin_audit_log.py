"""create admin_audit_log

Admin endpoints mutate other people's accounts (granting trials, forcing a
subscription status, revoking sessions) and left no record of who did it.

Revision ID: o5p6q7r8s9t0
Revises: n4o5p6q7r8s9
Create Date: 2026-08-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'o5p6q7r8s9t0'
down_revision = 'n4o5p6q7r8s9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'admin_audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        # SET NULL, not CASCADE: deleting either account must not delete the
        # record of what happened between them
        sa.Column('actor_user_id', sa.Integer(), nullable=True),
        sa.Column('actor_email', sa.String(length=255), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('target_user_id', sa.Integer(), nullable=True),
        sa.Column('target_email', sa.String(length=255), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_admin_audit_log_id'), 'admin_audit_log', ['id'])
    op.create_index(op.f('ix_admin_audit_log_action'), 'admin_audit_log', ['action'])
    op.create_index(
        op.f('ix_admin_audit_log_actor_user_id'), 'admin_audit_log', ['actor_user_id']
    )
    op.create_index(
        op.f('ix_admin_audit_log_target_user_id'), 'admin_audit_log', ['target_user_id']
    )
    op.create_index(
        op.f('ix_admin_audit_log_target_email'), 'admin_audit_log', ['target_email']
    )
    # The log is read newest-first, which is the only query it serves
    op.create_index(
        op.f('ix_admin_audit_log_created_at'), 'admin_audit_log', ['created_at']
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_admin_audit_log_created_at'), table_name='admin_audit_log')
    op.drop_index(op.f('ix_admin_audit_log_target_email'), table_name='admin_audit_log')
    op.drop_index(op.f('ix_admin_audit_log_target_user_id'), table_name='admin_audit_log')
    op.drop_index(op.f('ix_admin_audit_log_actor_user_id'), table_name='admin_audit_log')
    op.drop_index(op.f('ix_admin_audit_log_action'), table_name='admin_audit_log')
    op.drop_index(op.f('ix_admin_audit_log_id'), table_name='admin_audit_log')
    op.drop_table('admin_audit_log')
