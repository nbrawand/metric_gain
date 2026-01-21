"""Mesocycle, WorkoutTemplate, and WorkoutExercise models for training planning."""

from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Mesocycle(Base):
    """
    Mesocycle model representing a training block (typically 3-7 weeks).

    A mesocycle contains multiple workout templates and tracks progression
    through the training block with progressive overload and auto-regulation.
    """
    __tablename__ = "mesocycles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Duration
    weeks = Column(Integer, nullable=False)  # Total weeks in mesocycle (e.g., 4)
    start_date = Column(Date, nullable=True)  # Optional planned start date
    end_date = Column(Date, nullable=True)  # Optional planned end date

    # Status: planning, active, completed, archived
    status = Column(String(50), default="planning", nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="mesocycles")
    workout_templates = relationship("WorkoutTemplate", back_populates="mesocycle", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Mesocycle(id={self.id}, name='{self.name}', weeks={self.weeks}, status='{self.status}')>"


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
    exercises = relationship("WorkoutExercise", back_populates="workout_template", cascade="all, delete-orphan")

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

    # Target sets and reps
    target_sets = Column(Integer, nullable=False)
    target_reps_min = Column(Integer, nullable=False)  # e.g., 8 reps
    target_reps_max = Column(Integer, nullable=False)  # e.g., 12 reps (8-12 rep range)

    # RIR (Reps In Reserve) progression
    # Week 1 RIR (e.g., 3 RIR = could do 3 more reps)
    starting_rir = Column(Integer, default=3, nullable=False)
    # Final week RIR before deload (e.g., 0 RIR = going to failure)
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
