"""Audit record of admin actions taken against other users' accounts."""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class AdminAuditLog(Base):
    """One row per admin action that changed someone else's account.

    Emails are stored alongside the ids on purpose. The ids are the useful
    handle while both accounts exist, but a deleted user takes its row with it
    and an audit entry that can no longer say who did what to whom is not an
    audit entry. The denormalised copies survive that.
    """

    __tablename__ = "admin_audit_log"

    id = Column(Integer, primary_key=True, index=True)

    # SET NULL rather than CASCADE: deleting an admin must not erase the record
    # of what they did
    actor_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    actor_email = Column(String(255), nullable=False)

    action = Column(String(50), nullable=False, index=True)

    target_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    target_email = Column(String(255), nullable=False, index=True)

    # JSON blob of whatever the action needed to be reconstructable later —
    # the granted day count, the status moved from and to
    details = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    def __repr__(self):
        return (
            f"<AdminAuditLog(id={self.id}, action='{self.action}', "
            f"actor='{self.actor_email}', target='{self.target_email}')>"
        )
