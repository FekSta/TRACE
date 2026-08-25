"""
Category entity — Core Business Layer.

Defines the categories used to classify lost and found items.
Starter categories: Electronics, Bags, Clothes, Documents & Cards.

See: assets/diagrams/data-model.md § 5. Category
"""

import enum
import uuid
from typing import Optional

from sqlalchemy import DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class CategoryStatus(str, enum.Enum):
    """Category lifecycle status."""
    Active = "Active"
    Archived = "Archived"


class Category(Base):
    """
    Classification taxonomy for lost and found items.

    Attributes:
        id: Primary key (UUID)
        category_name: Category name (e.g. Electronics)
        description: Category description
        icon: UI icon reference
        display_order: Sort order for display
        status: Active or Archived
        created_at: Date category was created
    """

    __tablename__ = "category"

    id: Mapped[uuid.UUID] = mapped_column(
        "category_id",
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    category_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[CategoryStatus] = mapped_column(Enum(CategoryStatus), nullable=False, default=CategoryStatus.Active)
    created_at: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
