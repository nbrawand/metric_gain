"""Mesocycle, MesocycleInstance, WorkoutTemplate, and WorkoutExercise models for training planning."""

from sqlalchemy import Boolean, Column, Integer, String, Text, Date, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Mesocycle(Base):
    """
    Mesocycle TEMPLATE model representing a reusable training block blueprint.

    A mesocycle template contains workout templates with exercises. Users can
    start instances of this template to actually train.

    Stock mesocycles (is_stock=True, user_id=None) are available to all users.
    Custom mesocycles (is_stock=False, user_id=set) are only available to the creating user.
    """
    __tablename__ = "mesocycles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    is_stock = Column(Integer, default=0, nullable=False, index=True)  # 0 = custom, 1 = stock (using int for SQLite)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Default volume mode for blocks started from this template. Stored here so
    # the choice is made where the weekly increments it overrides are set —
    # picking "+2 sets/week" per exercise and then having it silently ignored
    # was the confusing part. Still overridable per run when starting a block.
    autoregulate_volume = Column(
        Boolean, default=True, nullable=False, server_default="true"
    )

    # Duration configuration
    weeks = Column(Integer, nullable=False)  # Total weeks in mesocycle (e.g., 4)
    days_per_week = Column(Integer, nullable=False, default=4)  # Number of training days per week

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="mesocycles")
    # Ordered because clients read the day plan positionally: day_number N is
    # the Nth workout template. Without this the rows arrive in whatever order
    # the database returns them, which need not be plan order after an edit.
    workout_templates = relationship(
        "WorkoutTemplate",
        back_populates="mesocycle",
        cascade="all, delete-orphan",
        order_by="WorkoutTemplate.order_index",
    )
    instances = relationship("MesocycleInstance", back_populates="mesocycle_template")

    def __repr__(self):
        return f"<Mesocycle(id={self.id}, name='{self.name}', weeks={self.weeks})>"


class MesocycleInstance(Base):
    """
    MesocycleInstance model representing an active training block instance.

    Created from a mesocycle template when a user starts training. Tracks
    progress through the mesocycle with status and dates.
    """
    __tablename__ = "mesocycle_instances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    mesocycle_template_id = Column(Integer, ForeignKey("mesocycles.id", ondelete="SET NULL"), nullable=True, index=True)

    # Snapshot fields (captured at instance creation for when template is deleted)
    template_name = Column(String(255), nullable=True)
    template_weeks = Column(Integer, nullable=True)  # Planned training weeks
    template_days_per_week = Column(Integer, nullable=True)

    # Whether this block carries the extra deload week after its training
    # weeks. Recorded per instance rather than derived, because blocks started
    # before deloads existed have no sessions for that week — computing it
    # would give them a phantom final week that can never be completed.
    includes_deload = Column(Boolean, default=True, nullable=False, server_default="false")

    # Whether set counts respond to logged performance instead of replaying the
    # weekly increment picked at creation. Stored per instance for the same
    # reason as includes_deload: blocks started before this shipped were
    # generated with the ramp already baked into every week, and autoregulating
    # them halfway through would fight those pre-computed counts.
    autoregulate_volume = Column(
        Boolean, default=True, nullable=False, server_default="false"
    )

    # Per-exercise note overrides, JSON: {"workout_exercise_id": "notes"}
    exercise_notes = Column(Text, nullable=True)

    # Status: active, completed, abandoned
    status = Column(String(50), default="active", nullable=False, index=True)

    # Dates
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)  # Set when completed

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    @property
    def total_weeks(self) -> int:
        """Weeks of sessions this block actually has, deload included."""
        return (self.template_weeks or 0) + (1 if self.includes_deload else 0)

    # Relationships
    user = relationship("User", back_populates="mesocycle_instances")
    mesocycle_template = relationship("Mesocycle", back_populates="instances")
    workout_sessions = relationship("WorkoutSession", back_populates="mesocycle_instance", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<MesocycleInstance(id={self.id}, template_id={self.mesocycle_template_id}, status='{self.status}')>"


class WorkoutTemplate(Base):
    """
    WorkoutTemplate model representing a workout within a mesocycle.

    Examples: "Push Day 1", "Pull Day 2", "Leg Day"
    Each workout template contains multiple exercises with their targets.
    """
    __tablename__ = "workout_templates"

    id = Column(Integer, primary_key=True, index=True)
    mesocycle_id = Column(Integer, ForeignKey("mesocycles.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Order in the mesocycle (0-indexed for sorting)
    order_index = Column(Integer, default=0, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    mesocycle = relationship("Mesocycle", back_populates="workout_templates")
    exercises = relationship(
        "WorkoutExercise",
        back_populates="workout_template",
        cascade="all, delete-orphan",
        order_by="WorkoutExercise.order_index",
    )

    def __repr__(self):
        return f"<WorkoutTemplate(id={self.id}, name='{self.name}', mesocycle_id={self.mesocycle_id})>"


class WorkoutExercise(Base):
    """
    WorkoutExercise model representing an exercise within a workout template.

    Stores the exercise configuration including sets, reps, RIR (Reps In Reserve),
    and target weight progression throughout the mesocycle.
    """
    __tablename__ = "workout_exercises"

    id = Column(Integer, primary_key=True, index=True)
    workout_template_id = Column(Integer, ForeignKey("workout_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True)

    # Order in the workout (0-indexed for sorting)
    order_index = Column(Integer, default=0, nullable=False)

    # Target sets and reps. target_sets is the week-1 set count;
    # weekly_set_increment is added each week (rounded half-up).
    target_sets = Column(Integer, nullable=False)
    weekly_set_increment = Column(Float, default=0, nullable=False)
    target_reps_min = Column(Integer, nullable=False)  # e.g., 8 reps
    target_reps_max = Column(Integer, nullable=False)  # e.g., 12 reps (8-12 rep range)

    # RIR (Reps In Reserve) progression
    # Week 1 RIR (e.g., 3 RIR = could do 3 more reps)
    starting_rir = Column(Integer, default=3, nullable=False)
    # Final week RIR (e.g., 0 RIR = going to failure). Not currently read:
    # the RIR ramp is computed in services/progression.py
    ending_rir = Column(Integer, default=0, nullable=False)

    # Optional notes for the exercise
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    workout_template = relationship("WorkoutTemplate", back_populates="exercises")
    exercise = relationship("Exercise")

    def __repr__(self):
        return f"<WorkoutExercise(id={self.id}, exercise_id={self.exercise_id}, sets={self.target_sets}, reps={self.target_reps_min}-{self.target_reps_max})>"
