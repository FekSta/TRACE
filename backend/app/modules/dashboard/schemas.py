"""Pydantic schemas for the Dashboard module (Administrator reporting).

Each row model mirrors one report's column set exactly (the labels live in the
frontend `reportConfig.ts`). Values are already joined and human-readable —
the API never makes the client stitch entities together, and filters/sorts are
applied server-side.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class ReportType(str, Enum):
    """The four on-demand Administrator reports (data-flow §3)."""

    USERS = "users"
    LOST_ITEMS = "lost_items"
    FOUND_ITEMS = "found_items"
    CLAIMS = "claims"


class UserReportRow(BaseModel):
    """Users report — one registered account (`User`)."""

    id: int
    first_name: str
    last_name: str
    student_number: str | None
    email: str
    role: str
    status: str
    created_at: str | None


class LostItemReportRow(BaseModel):
    """Lost items report — `LostItem` joined to `Category` + reporting `User`."""

    id: int
    item: str
    category: str | None
    reported_by: str
    date_lost: str | None
    location: str | None
    status: str


class FoundItemReportRow(BaseModel):
    """Found items report — `FoundItem` joined to `Category` + reporting `User`."""

    id: int
    item: str
    category: str | None
    found_by: str
    date_found: str | None
    storage_location: str | None
    status: str


class ClaimReportRow(BaseModel):
    """Claims report — `Claim` joined to both items, claimant and officer."""

    id: int
    lost_item: str | None
    found_item: str | None
    claimant: str
    officer: str | None
    claim_date: str | None
    verification_status: str
    status: str
    collected: str | None


class ReportResponse(BaseModel):
    """Envelope returned by `GET /dashboard/reports`.

    ``generated_at`` is stamped on every request so the UI can show a fresh
    "Generated: <date/time>" that updates whenever the grid reloads.
    """

    report_type: ReportType
    generated_at: datetime
    count: int
    rows: list[dict]
