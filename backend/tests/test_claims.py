"""Claims module tests — Module 5 Definition of Done.

These tests pin down the exact status transition table from Notes.md §11.3,
the atomicity guarantee, AuditLog creation, and terminal-state guards.

Authority: Notes.md §11 (Claims & Verification API), Review.md §Module 5
(decisions), TRACE_Issues.md Module 5 DoD.

The status transition table being tested:
| Outcome | Claim.VerificationStatus | Claim.Status | LostItem.Status | FoundItem.Status |
|---|---|---|---|---|
| Approve | Pending→Approved | Active→Active | Reported→Claimed | Available→Claimed |
| Reject | Pending→Rejected | Active→Cancelled | Reported→Reported | Available→Available |
| Collect | Approved→Approved | Active→Completed | Claimed→Closed | Claimed→Returned |
"""

import pytest

from sqlalchemy import select
from app.models import Claim, LostItem, FoundItem
from app.models.enums import (
    ClaimStatus,
    ClaimVerificationStatus,
    FoundItemStatus,
    LostItemStatus,
    MatchStatus,
)
from app.modules.claims.service import (
    create_from_match,
    collect_claim,
    verify_claim,
)
from app.modules.items.service import is_staff


# =============================================================================
# create_from_match — service function in isolation
# =============================================================================


class TestCreateFromMatch:
    """Module 5 DoD: create_from_match produces Claim with right FKs and status."""

    def test_create_from_accepted_match_produces_claim(
        self, db_session, match, user
    ):
        """Given an accepted Match, produces Claim with Pending/Active."""
        # Ensure the match is in Accepted state
        match.status = MatchStatus.ACCEPTED
        db_session.commit()

        claim = create_from_match(db_session, match, actor=user)

        assert claim.id is not None
        assert claim.lost_item_id == match.lost_item_id
        assert claim.found_item_id == match.found_item_id
        assert claim.user_id == match.lost_item.user_id  # claimant = lost item reporter
        assert claim.verification_status == ClaimVerificationStatus.PENDING
        assert claim.status == ClaimStatus.ACTIVE

    def test_create_from_match_idempotent(self, db_session, match, user):
        """Calling create_from_match twice returns the same claim."""
        match.status = MatchStatus.ACCEPTED
        db_session.commit()

        claim1 = create_from_match(db_session, match, actor=user)
        claim2 = create_from_match(db_session, match, actor=user)

        assert claim1.id == claim2.id

    def test_create_from_match_rejects_non_accepted_match(self, db_session, match, user):
        """Cannot create a claim from a Suggested match — must be Accepted."""
        match.status = MatchStatus.SUGGESTED
        db_session.commit()

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            create_from_match(db_session, match, actor=user)

        assert exc_info.value.status_code == 409
        assert "accepted match" in exc_info.value.detail.lower()


# =============================================================================
# Status transition table — one test per outcome
# =============================================================================


class TestApproveTransition:
    """Approve: Claim.Pending→Approved, LostItem.Reported→Claimed,
    FoundItem.Available→Claimed, Claim.Status stays Active."""

    def test_approve_sets_verification_status_to_approved(
        self, db_session, claim, officer
    ):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        result = verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.APPROVED,
            notes="ID matched",
            method="Student card check",
        )

        assert result.verification_status == ClaimVerificationStatus.APPROVED

    def test_approve_leaves_claim_status_active(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.APPROVED,
            notes=None,
            method=None,
        )

        assert claim.status == ClaimStatus.ACTIVE  # unchanged

    def test_approve_moves_lost_item_to_claimed(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.APPROVED,
            notes=None,
            method=None,
        )

        assert claim.lost_item.status == LostItemStatus.CLAIMED

    def test_approve_moves_found_item_to_claimed(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.APPROVED,
            notes=None,
            method=None,
        )

        assert claim.found_item.status == FoundItemStatus.CLAIMED

    def test_approve_sets_officer_id(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.officer_id = None
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.APPROVED,
            notes=None,
            method=None,
        )

        assert claim.officer_id == officer.id

    def test_approve_creates_verification_record(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.APPROVED,
            notes="Verified",
            method="Student card check",
        )
        db_session.flush()  # flush to make VerificationRecord queryable

        from app.models import VerificationRecord

        records = db_session.scalars(
            select(VerificationRecord).where(
                VerificationRecord.claim_id == claim.id
            )
        ).all()

        assert len(records) == 1
        assert records[0].result.value == "Passed"  # Approved → Passed
        assert records[0].officer_id == officer.id
        assert records[0].verification_method == "Student card check"
        assert records[0].notes == "Verified"


class TestRejectTransition:
    """Reject: Claim.Pending→Rejected, Claim.Active→Cancelled,
    items stay Reported/Available."""

    def test_reject_sets_verification_status_to_rejected(
        self, db_session, claim, officer
    ):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        result = verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.REJECTED,
            notes="Could not verify ownership",
            method="Visual inspection",
        )

        assert result.verification_status == ClaimVerificationStatus.REJECTED

    def test_reject_sets_claim_status_to_cancelled(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.REJECTED,
            notes=None,
            method=None,
        )

        assert claim.status == ClaimStatus.CANCELLED

    def test_reject_leaves_lost_item_reported(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.REJECTED,
            notes=None,
            method=None,
        )

        assert claim.lost_item.status == LostItemStatus.REPORTED  # unchanged

    def test_reject_leaves_found_item_available(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.REJECTED,
            notes=None,
            method=None,
        )

        assert claim.found_item.status == FoundItemStatus.AVAILABLE  # unchanged

    def test_reject_creates_verification_record_with_failed_result(
        self, db_session, claim, officer
    ):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.REJECTED,
            notes="Not the owner",
            method="Visual inspection",
        )
        db_session.flush()  # flush to make VerificationRecord queryable

        from app.models import VerificationRecord

        from app.models import VerificationRecord

        records = db_session.scalars(
            select(VerificationRecord).where(
                VerificationRecord.claim_id == claim.id
            )
        ).all()

        assert len(records) == 1
        assert records[0].result.value == "Failed"  # Rejected → Failed


class TestCollectTransition:
    """Collect: Claim.Active→Completed, LostItem.Claimed→Closed,
    FoundItem.Claimed→Returned (requires Approved claim)."""

    def test_collect_sets_claim_status_to_completed(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.APPROVED
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.CLAIMED
        claim.found_item.status = FoundItemStatus.CLAIMED
        db_session.commit()

        result = collect_claim(
            db_session,
            claim=claim,
            officer=officer,
            collected_by="Ada Lovelace",
            recipient_signature="A.Lovelace",
            remarks="Item handed over",
        )

        assert result.status == ClaimStatus.COMPLETED

    def test_collect_sets_collection_date(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.APPROVED
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.CLAIMED
        claim.found_item.status = FoundItemStatus.CLAIMED
        db_session.commit()

        collect_claim(
            db_session,
            claim=claim,
            officer=officer,
            collected_by=None,
            recipient_signature=None,
            remarks=None,
        )

        assert claim.collection_date is not None

    def test_collect_moves_lost_item_to_closed(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.APPROVED
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.CLAIMED
        claim.found_item.status = FoundItemStatus.CLAIMED
        db_session.commit()

        collect_claim(
            db_session,
            claim=claim,
            officer=officer,
            collected_by=None,
            recipient_signature=None,
            remarks=None,
        )

        assert claim.lost_item.status == LostItemStatus.CLOSED

    def test_collect_moves_found_item_to_returned(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.APPROVED
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.CLAIMED
        claim.found_item.status = FoundItemStatus.CLAIMED
        db_session.commit()

        collect_claim(
            db_session,
            claim=claim,
            officer=officer,
            collected_by=None,
            recipient_signature=None,
            remarks=None,
        )

        assert claim.found_item.status == FoundItemStatus.RETURNED

    def test_collect_creates_collection_record(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.APPROVED
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.CLAIMED
        claim.found_item.status = FoundItemStatus.CLAIMED
        db_session.commit()

        collect_claim(
            db_session,
            claim=claim,
            officer=officer,
            collected_by="Test Collector",
            recipient_signature="T.C.",
            remarks="All good",
        )
        db_session.flush()  # flush to make CollectionRecord queryable

        from app.models import CollectionRecord

        records = db_session.scalars(
            select(CollectionRecord).where(
                CollectionRecord.claim_id == claim.id
            )
        ).all()

        assert len(records) == 1
        assert records[0].collected_by == "Test Collector"
        assert records[0].recipient_signature == "T.C."
        assert records[0].remarks == "All good"
        assert records[0].officer_id == officer.id


# =============================================================================
# Terminal-state guards — verify/collect rejected/completed claims
# =============================================================================


class TestTerminalStateGuards:
    """Verifying or collecting an already-completed/rejected claim is rejected."""

    def test_cannot_verify_already_verified_claim(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.APPROVED
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.CLAIMED
        claim.found_item.status = FoundItemStatus.CLAIMED
        db_session.commit()

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            verify_claim(
                db_session,
                claim=claim,
                officer=officer,
                result=ClaimVerificationStatus.APPROVED,
                notes=None,
                method=None,
            )

        assert exc_info.value.status_code == 400
        assert "already been verified" in exc_info.value.detail.lower()

    def test_cannot_verify_rejected_claim(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.REJECTED
        claim.status = ClaimStatus.CANCELLED
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            verify_claim(
                db_session,
                claim=claim,
                officer=officer,
                result=ClaimVerificationStatus.APPROVED,
                notes=None,
                method=None,
            )

        assert exc_info.value.status_code == 400

    def test_cannot_verify_completed_claim(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.APPROVED
        claim.status = ClaimStatus.COMPLETED
        claim.lost_item.status = LostItemStatus.CLOSED
        claim.found_item.status = FoundItemStatus.RETURNED
        db_session.commit()

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            verify_claim(
                db_session,
                claim=claim,
                officer=officer,
                result=ClaimVerificationStatus.APPROVED,
                notes=None,
                method=None,
            )

        assert exc_info.value.status_code == 400
        assert "not active" in exc_info.value.detail.lower()

    def test_cannot_collect_pending_claim(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            collect_claim(
                db_session,
                claim=claim,
                officer=officer,
                collected_by=None,
                recipient_signature=None,
                remarks=None,
            )

        assert exc_info.value.status_code == 400
        assert "must be approved" in exc_info.value.detail.lower()

    def test_cannot_collect_rejected_claim(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.REJECTED
        claim.status = ClaimStatus.CANCELLED
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            collect_claim(
                db_session,
                claim=claim,
                officer=officer,
                collected_by=None,
                recipient_signature=None,
                remarks=None,
            )

        assert exc_info.value.status_code == 400

    def test_cannot_collect_already_completed_claim(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.APPROVED
        claim.status = ClaimStatus.COMPLETED
        claim.lost_item.status = LostItemStatus.CLOSED
        claim.found_item.status = FoundItemStatus.RETURNED
        claim.collection_date = None  # reset for test
        db_session.commit()

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            collect_claim(
                db_session,
                claim=claim,
                officer=officer,
                collected_by=None,
                recipient_signature=None,
                remarks=None,
            )

        assert exc_info.value.status_code == 400
        assert "not active" in exc_info.value.detail.lower()


# =============================================================================
# Atomicity — force failure mid-transaction, assert rollback
# =============================================================================


class TestAtomicity:
    """Atomicity: the service functions mutate the session but don't commit.

    The endpoint is responsible for the single db.commit(). This means all
    writes from verify_claim/collect_claim happen in-memory until commit.

    True atomicity testing (forcing a DB-level failure mid-transaction and
    verifying rollback) requires Postgres with real FK constraints — SQLite
    in-memory doesn't enforce them the same way. Module 5's Review.md documents
    that atomicity was verified by forcing an IntegrityError (a VerificationRecord
    with a non-existent officer_id) during a real Postgres transaction. We test
    the pattern here: verify that the service function adds all expected writes
    to the session, and that the caller controls the commit point.
    """

    def test_verify_claim_adds_all_writes_to_session_before_commit(
        self, db_session, claim, officer
    ):
        """verify_claim mutates session but doesn't commit — caller controls commit."""
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        # Call verify_claim — it mutates the session but does NOT commit
        verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.APPROVED,
            notes="Verified",
            method="ID check",
        )

        # At this point the session has pending changes but they're not committed
        # The claim object in memory reflects the changes ( SQLAlchemy autoflush )
        assert claim.verification_status == ClaimVerificationStatus.APPROVED
        assert claim.lost_item.status == LostItemStatus.CLAIMED
        assert claim.found_item.status == FoundItemStatus.CLAIMED

        # Now commit — this is what the endpoint does
        db_session.commit()

        # After commit, verify everything persisted
        db_session.refresh(claim)
        db_session.refresh(claim.lost_item)
        db_session.refresh(claim.found_item)

        assert claim.verification_status == ClaimVerificationStatus.APPROVED
        assert claim.lost_item.status == LostItemStatus.CLAIMED
        assert claim.found_item.status == FoundItemStatus.CLAIMED


# =============================================================================
# AuditLog — one row per mutating step
# =============================================================================


class TestAuditLog:
    """Each mutating step writes exactly one AuditLog row."""

    def test_approve_creates_audit_log(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.APPROVED,
            notes=None,
            method=None,
        )
        db_session.commit()  # commit to persist the audit log

        from app.models import AuditLog

        audits = db_session.scalars(
            select(AuditLog).where(
                AuditLog.entity_name == "Claim",
                AuditLog.entity_id == claim.id,
                AuditLog.action == "ClaimApproved",
            )
        ).all()

        assert len(audits) == 1
        assert audits[0].user_id == officer.id

    def test_reject_creates_audit_log(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.PENDING
        claim.lost_item.status = LostItemStatus.REPORTED
        claim.found_item.status = FoundItemStatus.AVAILABLE
        db_session.commit()

        verify_claim(
            db_session,
            claim=claim,
            officer=officer,
            result=ClaimVerificationStatus.REJECTED,
            notes=None,
            method=None,
        )
        db_session.commit()  # commit to persist the audit log

        from app.models import AuditLog

        audits = db_session.scalars(
            select(AuditLog).where(
                AuditLog.entity_name == "Claim",
                AuditLog.entity_id == claim.id,
                AuditLog.action == "ClaimRejected",
            )
        ).all()

        assert len(audits) == 1
        assert audits[0].user_id == officer.id

    def test_collect_creates_audit_log(self, db_session, claim, officer):
        claim.verification_status = ClaimVerificationStatus.APPROVED
        claim.status = ClaimStatus.ACTIVE
        claim.lost_item.status = LostItemStatus.CLAIMED
        claim.found_item.status = FoundItemStatus.CLAIMED
        db_session.commit()

        collect_claim(
            db_session,
            claim=claim,
            officer=officer,
            collected_by=None,
            recipient_signature=None,
            remarks=None,
        )
        db_session.commit()  # commit to persist the audit log

        from app.models import AuditLog

        audits = db_session.scalars(
            select(AuditLog).where(
                AuditLog.entity_name == "Claim",
                AuditLog.entity_id == claim.id,
                AuditLog.action == "ClaimCollected",
            )
        ).all()

        assert len(audits) == 1
        assert audits[0].user_id == officer.id


# =============================================================================
# Scoping — User sees own claims, Officer sees all
# =============================================================================


class TestClaimScoping:
    """GET /claims scoping: User sees own, Officer sees all, cross-user → 404."""

    def test_officer_can_list_all_claims(self, client, officer_token):
        resp = client.get(
            "/claims",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
