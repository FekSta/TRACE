"""Claims module API (Module 5).

Issue 1 exposes read endpoints only. Claim **creation** is not a public
``POST /claims``: it happens as a direct in-process call from the Matching
module's accept-match endpoint (``service.create_from_match``) — this module
documents that design choice rather than hiding it. The Officer-facing
verify/collect endpoints land in Module 5 issue 2.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Claim, User
from app.models.enums import ClaimVerificationStatus
from app.modules.auth.deps import get_current_user
from app.modules.claims.schemas import ClaimResponse
from app.modules.claims.service import get_scoped_claim
from app.modules.items.service import is_staff

router = APIRouter(tags=["claims"])


@router.get("/claims", response_model=list[ClaimResponse])
def list_claims(
    verification_status: ClaimVerificationStatus | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Claim]:
    """List claims — Users see only their own (claim status tracking);
    Officer/Admin see all. Optional filter: ``?verification_status=``."""
    q = select(Claim).order_by(Claim.id.desc())
    if not is_staff(current_user):
        q = q.where(Claim.user_id == current_user.id)
    if verification_status is not None:
        q = q.where(Claim.verification_status == verification_status)
    return list(db.scalars(q).all())


@router.get("/claims/{claim_id}", response_model=ClaimResponse)
def get_claim(
    claim_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Claim:
    """Get one claim — 404 for cross-user access attempts."""
    return get_scoped_claim(db, claim_id, current_user)
