"""
AuditLog entity — Supporting Layer.

Maintains a complete audit trail of significant system events.

See: assets/diagrams/data-model.md § 11. AuditLog
"""

import uuid
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class AuditLog(Base):
    """
    Immutable audit trail of system actions.

    Records who did what, when, and from where. Never deleted — append-only.

    Attributes:
        id: Primary key (UUID)
        user_id: FK → User — user performing the action (nullable for system actions)
        action: Action performed (e.g. "create", "update", "delete", "login")
        entity_name: Name of the entity affected (e.g. "LostItem", "Claim")
        entity_id: UUID of the affected record
        timestamp: Date/time of action
        ip_address: Originating IP address
    """

    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(
        "audit_id",
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    timestamp: Mapped[Optional[str]] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
