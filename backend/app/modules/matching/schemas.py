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

    model_config = ConfigDict(from_attributes=True)
