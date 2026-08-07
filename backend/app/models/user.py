"""User model for authentication."""

from sqlalchemy import BigInteger, Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    """User model for authentication and profile management."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)

    # Bumped to invalidate every token already issued to this user. JWTs are
    # self-contained, so without this a leaked access or refresh token stays
    # usable for its full lifetime and signing out cannot take it back.
    token_version = Column(Integer, default=0, nullable=False, server_default="0")

    # Subscription
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    subscription_status = Column(String(50), default="trialing", nullable=False)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)

    # The Stripe event last applied to this user's subscription state. Stripe
    # neither orders deliveries nor stops retrying for days, so without these
    # a stale past_due retry could overwrite a newer active status, and
    # nothing after it would ever put the account right again.
    stripe_event_id = Column(String(255), nullable=True)
    stripe_event_created = Column(BigInteger, nullable=True)  # unix seconds

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
