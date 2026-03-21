"""create user_muscle_params table

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-03-21 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
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


def downgrade() -> None:
    op.drop_index(op.f('ix_user_muscle_params_user_id'), table_name='user_muscle_params')
    op.drop_index(op.f('ix_user_muscle_params_id'), table_name='user_muscle_params')
    op.drop_table('user_muscle_params')
