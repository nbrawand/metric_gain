"""User model for authentication."""

from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    """User model for authentication and profile management."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Account status
    is_active = Column(Boolean, default=True, nullable=False)

    # Future features
    timezone = Column(String(50), default="UTC", nullable=False)
    preferences = Column(String, default="{}", nullable=False)  # JSON stored as string for SQLite compatibility

    # Relationships
    custom_exercises = relationship("Exercise", back_populates="user", cascade="all, delete-orphan")
    mesocycles = relationship("Mesocycle", back_populates="user", cascade="all, delete-orphan")
    mesocycle_instances = relationship("MesocycleInstance", back_populates="user", cascade="all, delete-orphan")
    workout_sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"
