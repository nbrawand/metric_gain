"""WorkoutSession and WorkoutSet models for tracking actual workout execution."""

from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class WorkoutSession(Base):
    """
    WorkoutSession model representing an actual workout performed by a user.

    Tracks a single workout session, linked to a specific workout template
    from a mesocycle. Records which week of the mesocycle this workout
    belongs to and the actual date it was performed.
    """
    __tablename__ = "workout_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    mesocycle_id = Column(Integer, ForeignKey("mesocycles.id", ondelete="CASCADE"), nullable=False, index=True)
    workout_template_id = Column(Integer, ForeignKey("workout_templates.id", ondelete="CASCADE"), nullable=False, index=True)

    # Workout details
    workout_date = Column(Date, nullable=False, index=True)  # When the workout was performed
    week_number = Column(Integer, nullable=False)  # Which week in the mesocycle (1-based)
    day_number = Column(Integer, nullable=False)  # Which day in the week (1-based, corresponds to order_index + 1)

    # Status: in_progress, completed, skipped
    status = Column(String(50), default="in_progress", nullable=False, index=True)

    # Duration and notes
    duration_minutes = Column(Integer, nullable=True)  # How long the workout took
    notes = Column(Text, nullable=True)  # Optional notes about the workout

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)  # When the workout was marked complete

    # Relationships
    user = relationship("User", back_populates="workout_sessions")
    mesocycle = relationship("Mesocycle")
    workout_template = relationship("WorkoutTemplate")
    workout_sets = relationship("WorkoutSet", back_populates="workout_session", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<WorkoutSession(id={self.id}, date={self.workout_date}, week={self.week_number}, status='{self.status}')>"


class WorkoutSet(Base):
    """
    WorkoutSet model representing a single set performed during a workout.

    Tracks the actual performance of one set of an exercise, including
    weight, reps, and RIR (Reps In Reserve). This is the core data for
    progressive overload tracking.
    """
    __tablename__ = "workout_sets"

    id = Column(Integer, primary_key=True, index=True)
    workout_session_id = Column(Integer, ForeignKey("workout_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True)

    # Set details
    set_number = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    order_index = Column(Integer, default=0, nullable=False)  # Order of this exercise in the workout

    # Performance metrics
    weight = Column(Float, nullable=False)  # Weight used (in kg or lbs based on user preference)
    reps = Column(Integer, nullable=False)  # Actual reps performed
    rir = Column(Integer, nullable=True)  # Reps In Reserve (how many more could have been done)

    # Target values (what was planned vs what was achieved)
    target_weight = Column(Float, nullable=True)  # What weight was recommended
    target_reps = Column(Integer, nullable=True)  # What rep range was targeted
    target_rir = Column(Integer, nullable=True)  # What RIR was targeted

    # Optional notes for this specific set
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    workout_session = relationship("WorkoutSession", back_populates="workout_sets")
    exercise = relationship("Exercise")

    def __repr__(self):
        return f"<WorkoutSet(id={self.id}, exercise_id={self.exercise_id}, set={self.set_number}, weight={self.weight}, reps={self.reps})>"
