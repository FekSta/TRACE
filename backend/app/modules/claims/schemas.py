"""Pydantic schemas for the Claims module (Module 5).

Enum values come from the model enums (which mirror
`assets/diagrams/data-model.md` exactly), so the API cannot drift from the
entities.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

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
    # Display enrichment (Slice A): `claimant_name` is populated for staff on
    # any claim and for a plain User only on their own claims; `officer_name`
    # is staff-only. `lost_item_title` / `found_item_title` are safe for every
    # caller who can see the claim (a claim is inherently about its pairing)
    # and replace `Lost #{id} / Found #{id}` in the UI. See Notes.md §11.8.
    lost_item_title: str | None = None
    found_item_title: str | None = None
    claimant_name: str | None = None
    officer_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ClaimVerifyRequest(BaseModel):
    """Officer decision on a pending claim.

    ``result`` is the target ``Claim.VerificationStatus`` — ``Approved`` or
    ``Rejected``. ``Pending`` is rejected by validation below; a claim can
    only be verified once.
    """

    result: ClaimVerificationStatus
    notes: str | None = Field(default=None, max_length=2000)
    verification_method: str | None = Field(default=None, max_length=100)

    @field_validator("result")
    @classmethod
    def _result_must_be_a_decision(
        cls, v: ClaimVerificationStatus
    ) -> ClaimVerificationStatus:
        if v == ClaimVerificationStatus.PENDING:
            raise ValueError("result must be 'Approved' or 'Rejected'")
        return v


class ClaimCollectRequest(BaseModel):
    """Details recorded when an approved item is handed to the claimant.

    All fields optional — send ``{}`` to record the collection with no extras.
    """

    collected_by: str | None = Field(default=None, max_length=200)
    recipient_signature: str | None = Field(default=None, max_length=255)
    remarks: str | None = Field(default=None, max_length=2000)
