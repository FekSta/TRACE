"""
AuditLog entity — Supporting Layer.

Maintains a complete audit trail of significant system events.

See: Entities.md § 11. AuditLog
"""

from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Identity, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base


class AuditLog(Base):
    """
    Immutable audit trail of system actions.

    Records who did what, when, and from where. Never deleted — append-only.

    Attributes:
        id: Primary key (integer, auto-increment)
        user_id: FK → User — user performing the action (nullable for system actions)
        action: Action performed (e.g. "create", "update", "delete", "login")
        entity_name: Name of the entity affected (e.g. "LostItem", "Claim")
        entity_id: Integer ID of the affected record
        timestamp: Date/time of action
        ip_address: Originating IP address
    """

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer)
    timestamp: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Relationships
    user: Mapped["User | None"] = relationship(back_populates="audit_logs")
