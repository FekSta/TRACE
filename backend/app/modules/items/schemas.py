"""Pydantic schemas for the Items module (Module 3).

Enum values come straight from the model enums (which mirror
`assets/diagrams/data-model.md` exactly), so the API cannot drift from the
entities. Update schemas are partial (all fields optional) — the API uses
PATCH semantics for updates.
"""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    CategoryStatus,
    FoundItemStatus,
    LostItemStatus,
    RelatedEntity,
)


# --- Category ---------------------------------------------------------------

class CategoryCreate(BaseModel):
    category_name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    icon: str | None = Field(default=None, max_length=100)
    display_order: int | None = Field(default=None, ge=0, le=9999)


class CategoryUpdate(BaseModel):
    category_name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    icon: str | None = Field(default=None, max_length=100)
    display_order: int | None = Field(default=None, ge=0, le=9999)
    status: CategoryStatus | None = None


class CategoryResponse(BaseModel):
    id: int
    category_name: str
    description: str | None
    icon: str | None
    display_order: int | None
    status: CategoryStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- LostItem ---------------------------------------------------------------

class LostItemCreate(BaseModel):
    category_id: int
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    brand: str | None = Field(default=None, max_length=100)
    colour: str | None = Field(default=None, max_length=50)
    date_lost: date | None = None
    location_lost: str | None = Field(default=None, max_length=200)


class LostItemUpdate(BaseModel):
    category_id: int | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    brand: str | None = Field(default=None, max_length=100)
    colour: str | None = Field(default=None, max_length=50)
    date_lost: date | None = None
    location_lost: str | None = Field(default=None, max_length=200)
    status: LostItemStatus | None = None


class LostItemResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    title: str
    description: str | None
    brand: str | None
    colour: str | None
    date_lost: date | None
    location_lost: str | None
    status: LostItemStatus

    model_config = ConfigDict(from_attributes=True)


# --- FoundItem --------------------------------------------------------------

class FoundItemCreate(BaseModel):
    category_id: int
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    brand: str | None = Field(default=None, max_length=100)
    colour: str | None = Field(default=None, max_length=50)
    date_found: date | None = None
    storage_location: str | None = Field(default=None, max_length=200)


class FoundItemUpdate(BaseModel):
    category_id: int | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    brand: str | None = Field(default=None, max_length=100)
    colour: str | None = Field(default=None, max_length=50)
    date_found: date | None = None
    storage_location: str | None = Field(default=None, max_length=200)
    status: FoundItemStatus | None = None


class FoundItemResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    title: str
    description: str | None
    brand: str | None
    colour: str | None
    date_found: date | None
    storage_location: str | None
    status: FoundItemStatus

    model_config = ConfigDict(from_attributes=True)


# --- Attachment -------------------------------------------------------------

class AttachmentResponse(BaseModel):
    id: int
    file_name: str
    file_path: str
    file_type: str
    uploaded_by: int
    uploaded_at: datetime
    related_entity: RelatedEntity
    entity_id: int | None

    model_config = ConfigDict(from_attributes=True)
