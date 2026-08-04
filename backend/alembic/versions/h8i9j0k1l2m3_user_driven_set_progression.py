"""user-driven set progression: add weekly_set_increment, drop volume machinery

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-08-04

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'h8i9j0k1l2m3'
down_revision = 'g7h8i9j0k1l2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'workout_exercises',
        sa.Column('weekly_set_increment', sa.Float(), nullable=False, server_default='0'),
    )

    with op.batch_alter_table('mesocycle_instances') as batch_op:
        batch_op.drop_column('volume_profile')

    op.drop_index(op.f('ix_workout_feedback_workout_session_id'), table_name='workout_feedback')
    op.drop_index(op.f('ix_workout_feedback_id'), table_name='workout_feedback')
    op.drop_table('workout_feedback')

    op.drop_index(op.f('ix_user_muscle_params_user_id'), table_name='user_muscle_params')
    op.drop_index(op.f('ix_user_muscle_params_id'), table_name='user_muscle_params')
    op.drop_table('user_muscle_params')


def downgrade() -> None:
    op.create_table(
        'user_muscle_params',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('muscle_group', sa.String(length=100), nullable=False),
        sa.Column('k1', sa.Float(), nullable=False),
        sa.Column('k3', sa.Float(), nullable=False),
        sa.Column('kappa0', sa.Float(), nullable=False),
        sa.Column('tau1', sa.Float(), nullable=False),
        sa.Column('tau2', sa.Float(), nullable=False),
        sa.Column('tau3', sa.Float(), nullable=False),
        sa.Column('tau_alpha', sa.Float(), nullable=False),
        sa.Column('alpha0', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'muscle_group', name='uq_user_muscle_group'),
    )
    op.create_index(op.f('ix_user_muscle_params_id'), 'user_muscle_params', ['id'], unique=False)
    op.create_index(op.f('ix_user_muscle_params_user_id'), 'user_muscle_params', ['user_id'], unique=False)

    op.create_table(
        'workout_feedback',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workout_session_id', sa.Integer(), nullable=False),
        sa.Column('muscle_group', sa.String(length=100), nullable=False),
        sa.Column('difficulty', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['workout_session_id'], ['workout_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_workout_feedback_id'), 'workout_feedback', ['id'], unique=False)
    op.create_index(op.f('ix_workout_feedback_workout_session_id'), 'workout_feedback', ['workout_session_id'], unique=False)

    op.add_column('mesocycle_instances', sa.Column('volume_profile', sa.Text(), nullable=True))

    with op.batch_alter_table('workout_exercises') as batch_op:
        batch_op.drop_column('weekly_set_increment')
