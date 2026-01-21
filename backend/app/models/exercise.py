"""Exercise model for storing exercise library."""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Exercise(Base):
    """
    Exercise model representing both default and custom exercises.

    Default exercises (is_custom=False, user_id=None) are available to all users.
    Custom exercises (is_custom=True, user_id=set) are only available to the creating user.
    """
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    muscle_group = Column(String(100), nullable=False, index=True)
    equipment = Column(String(100), nullable=True)
    is_custom = Column(Boolean, default=False, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="custom_exercises")

    def __repr__(self):
        return f"<Exercise(id={self.id}, name='{self.name}', muscle_group='{self.muscle_group}', is_custom={self.is_custom})>"
