"""Pydantic schemas for the Matching module (Module 4).

Enum and Decimal values come from the model (which mirrors
`assets/diagrams/data-model.md`), so the API cannot drift from the entities.
"""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import MatchStatus


class MatchResponse(BaseModel):
    id: int
    lost_item_id: int
    found_item_id: int
    match_score: Decimal
    match_reason: str | None
    status: MatchStatus
    generated_at: datetime
    # Display enrichment (Slice A): item titles are safe for every caller who
    # can see the match (the pairing is the point of a match); reporter names
    # are staff-only, so a plain User never sees another user's identity
    # (Notes.md §10.8).
    lost_item_title: str | None = None
    found_item_title: str | None = None
    lost_reporter_name: str | None = None
    found_reporter_name: str | None = None

    model_config = ConfigDict(from_attributes=True)
