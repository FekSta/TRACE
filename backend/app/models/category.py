"""
Category entity — Core Business Layer.

Defines the categories used to classify lost and found items.
Starter categories: Electronics, Bags, Clothes, Documents & Cards.

See: Entities.md § 5. Category
"""

from typing import Optional

from sqlalchemy import DateTime, Identity, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base
from backend.app.models.enums import CategoryStatus, CategoryStatusType


class Category(Base):
    """
    Classification taxonomy for lost and found items.

    Attributes:
        id: Primary key (integer, auto-increment)
        category_name: Category name (e.g. Electronics)
        description: Category description
        icon: UI icon reference
        display_order: Sort order for display (nullable)
        status: Active or Archived
        created_at: Date category was created
    """

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    category_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    display_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[CategoryStatus] = mapped_column(CategoryStatusType, default=CategoryStatus.ACTIVE)
    created_at: Mapped[Optional[str]] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    lost_items: Mapped[list["LostItem"]] = relationship(back_populates="category")
    found_items: Mapped[list["FoundItem"]] = relationship(back_populates="category")
