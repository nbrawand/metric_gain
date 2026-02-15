"""decouple instances from templates

Revision ID: a1b2c3d4e5f6
Revises: 1c50099fca6d
Create Date: 2026-02-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '1c50099fca6d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add snapshot columns to mesocycle_instances
    op.add_column('mesocycle_instances', sa.Column('template_name', sa.String(255), nullable=True))
    op.add_column('mesocycle_instances', sa.Column('template_weeks', sa.Integer(), nullable=True))
    op.add_column('mesocycle_instances', sa.Column('template_days_per_week', sa.Integer(), nullable=True))

    # Backfill snapshot columns from mesocycles table
    op.execute(
        "UPDATE mesocycle_instances SET "
        "template_name = (SELECT name FROM mesocycles WHERE mesocycles.id = mesocycle_instances.mesocycle_template_id), "
        "template_weeks = (SELECT weeks FROM mesocycles WHERE mesocycles.id = mesocycle_instances.mesocycle_template_id), "
        "template_days_per_week = (SELECT days_per_week FROM mesocycles WHERE mesocycles.id = mesocycle_instances.mesocycle_template_id)"
    )

    # Drop existing FK on mesocycle_instances.mesocycle_template_id, make nullable, recreate with SET NULL
    with op.batch_alter_table('mesocycle_instances') as batch_op:
        batch_op.drop_constraint('mesocycle_instances_mesocycle_template_id_fkey', type_='foreignkey')
        batch_op.alter_column('mesocycle_template_id', existing_type=sa.Integer(), nullable=True)
        batch_op.create_foreign_key(
            'mesocycle_instances_mesocycle_template_id_fkey',
            'mesocycles',
            ['mesocycle_template_id'],
            ['id'],
            ondelete='SET NULL',
        )

    # Drop existing FK on workout_sessions.workout_template_id, make nullable, recreate with SET NULL
    with op.batch_alter_table('workout_sessions') as batch_op:
        batch_op.drop_constraint('workout_sessions_workout_template_id_fkey', type_='foreignkey')
        batch_op.alter_column('workout_template_id', existing_type=sa.Integer(), nullable=True)
        batch_op.create_foreign_key(
            'workout_sessions_workout_template_id_fkey',
            'workout_templates',
            ['workout_template_id'],
            ['id'],
            ondelete='SET NULL',
        )


def downgrade() -> None:
    # Restore workout_sessions FK to CASCADE and NOT NULL
    with op.batch_alter_table('workout_sessions') as batch_op:
        batch_op.drop_constraint('workout_sessions_workout_template_id_fkey', type_='foreignkey')
        batch_op.alter_column('workout_template_id', existing_type=sa.Integer(), nullable=False)
        batch_op.create_foreign_key(
            'workout_sessions_workout_template_id_fkey',
            'workout_templates',
            ['workout_template_id'],
            ['id'],
            ondelete='CASCADE',
        )

    # Restore mesocycle_instances FK to CASCADE and NOT NULL
    with op.batch_alter_table('mesocycle_instances') as batch_op:
        batch_op.drop_constraint('mesocycle_instances_mesocycle_template_id_fkey', type_='foreignkey')
        batch_op.alter_column('mesocycle_template_id', existing_type=sa.Integer(), nullable=False)
        batch_op.create_foreign_key(
            'mesocycle_instances_mesocycle_template_id_fkey',
            'mesocycles',
            ['mesocycle_template_id'],
            ['id'],
            ondelete='CASCADE',
        )

    # Drop snapshot columns
    op.drop_column('mesocycle_instances', 'template_days_per_week')
    op.drop_column('mesocycle_instances', 'template_weeks')
    op.drop_column('mesocycle_instances', 'template_name')
