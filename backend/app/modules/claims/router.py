"""Claims module API (Module 5).

Claim **creation** is not a public ``POST /claims``: it happens as a direct
in-process call from the Matching module's accept-match endpoint
(``service.create_from_match``). This module exposes the read endpoints
(claim-status tracking for Users, full visibility for staff) and the
Officer/Admin verify workflow.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Claim, User
from app.models.enums import ClaimVerificationStatus, UserRole
from app.modules.auth.deps import get_current_user, require_role
from app.modules.claims.schemas import ClaimResponse, ClaimVerifyRequest
from app.modules.claims.service import get_scoped_claim, verify_claim
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


def _get_claim_or_404(db: Session, claim_id: int) -> Claim:
    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found"
        )
    return claim


@router.post("/claims/{claim_id}/verify", response_model=ClaimResponse)
def verify_claim_endpoint(
    claim_id: int,
    body: ClaimVerifyRequest,
    current_user: User = Depends(
        require_role(UserRole.OFFICER, UserRole.ADMINISTRATOR)
    ),
    db: Session = Depends(get_db),
) -> Claim:
    """Officer/Admin decision on a pending claim (approve or reject).

    **Approve** — ``Claim.VerificationStatus → Approved``, ``LostItem →
    Claimed``, ``FoundItem → Claimed`` (atomic — all three plus the
    VerificationRecord and AuditLog rows commit together or not at all).

    **Reject** — ``Claim.VerificationStatus → Rejected``, ``Claim.Status →
    Cancelled``; items stay ``Reported``/``Available``.

    Errors: ``403`` for non-Officer callers, ``404`` unknown claim,
    ``400`` claim not Pending/Active (e.g. already verified, completed, or
    cancelled), ``422`` invalid body (e.g. ``result: "Pending"``).
    """
    claim = _get_claim_or_404(db, claim_id)
    verify_claim(
        db,
        claim=claim,
        officer=current_user,
        result=body.result,
        notes=body.notes,
        method=body.verification_method,
    )
    db.commit()
    db.refresh(claim)
    return claim
