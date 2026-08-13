"""Pydantic schemas for the Claims module (Module 5).

Enum values come from the model enums (which mirror
`assets/diagrams/data-model.md` exactly), so the API cannot drift from the
entities.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ClaimStatus, ClaimVerificationStatus


class ClaimResponse(BaseModel):
    """Full Claim row — used by the read endpoints and as the response of the
    verify/collect endpoints (which return the claim in its new state)."""

    id: int
    lost_item_id: int
    found_item_id: int
    user_id: int
    claim_date: datetime
    verification_status: ClaimVerificationStatus
    officer_id: int | None
    verification_notes: str | None
    collection_date: datetime | None
    status: ClaimStatus

    model_config = ConfigDict(from_attributes=True)
