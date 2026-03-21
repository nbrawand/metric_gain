"""Per-user, per-muscle-group optimizer parameters."""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class UserMuscleParams(Base):
    """Stores volume optimizer parameters for each muscle group per user.

    Allows the optimizer to run independently per muscle group and enables
    feedback-driven adjustments (e.g. tweaking k3 based on volume feedback).
    """

    __tablename__ = "user_muscle_params"
    __table_args__ = (
        UniqueConstraint("user_id", "muscle_group", name="uq_user_muscle_group"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    muscle_group = Column(String(100), nullable=False)

    # Optimizer parameters
    k1 = Column(Float, nullable=False)
    k3 = Column(Float, nullable=False)
    kappa0 = Column(Float, nullable=False)
    tau1 = Column(Float, nullable=False)
    tau2 = Column(Float, nullable=False)
    tau3 = Column(Float, nullable=False)
    tau_alpha = Column(Float, nullable=False)
    alpha0 = Column(Float, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="muscle_params")

    def __repr__(self):
        return f"<UserMuscleParams(user_id={self.user_id}, muscle_group='{self.muscle_group}', k3={self.k3})>"

    def to_params_dict(self) -> dict:
        """Return optimizer params as a plain dict."""
        return {
            "k1": self.k1,
            "k3": self.k3,
            "kappa0": self.kappa0,
            "tau1": self.tau1,
            "tau2": self.tau2,
            "tau3": self.tau3,
            "tau_alpha": self.tau_alpha,
            "alpha0": self.alpha0,
        }
