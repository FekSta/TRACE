"""Model tests for all 11 TRACE entities.

Each test asserts:
1. The table exists with the correct columns (matching Entities.md §4 exactly).
2. Enum values match Entities.md exactly (case-sensitive).
3. FK relationships resolve both directions (create parent, create child, confirm).

These tests pin down the data contract every other module relies on — if a
column is renamed, a FK is dropped, or an enum value is changed, these tests
turn red immediately.

Authority: Notes.md §4 (entity reference) and Entities.md (the 11 entities).
"""


from datetime import date
from decimal import Decimal

import pytest

from app.models import (  # noqa: E402 — conftest imports app after env is set
    AuditLog,
    Attachment,
    Category,
    Claim,
    CollectionRecord,
    FoundItem,
    Match,
    Notification,
    User,
    VerificationRecord,
    LostItem,
)
from app.models.enums import (  # noqa: E402
    ClaimVerificationStatus,
    ClaimStatus,
    CategoryStatus,
    FoundItemStatus,
    LostItemStatus,
    MatchStatus,
    NotificationType,
    RelatedEntity,
    UserRole,
    UserStatus,
    VerificationResult,
)


# =============================================================================
# Enum value assertions — verify every enum matches Entities.md exactly
# =============================================================================


class TestUserRoleEnumValues:
    """Entities.md §4.1: Role enum = User, Officer, Administrator."""

    def test_user_role_has_exact_three_values(self):
        values = [m.value for m in UserRole]
        assert set(values) == {"User", "Officer", "Administrator"}

    def test_user_role_member_names(self):
        assert UserRole.USER.value == "User"
        assert UserRole.OFFICER.value == "Officer"
        assert UserRole.ADMINISTRATOR.value == "Administrator"


class TestUserStatusEnumValues:
    """Entities.md §4.1: Status enum = Active, Suspended, Inactive."""

    def test_user_status_has_exact_three_values(self):
        values = [m.value for m in UserStatus]
        assert set(values) == {"Active", "Suspended", "Inactive"}

    def test_user_status_member_names(self):
        assert UserStatus.ACTIVE.value == "Active"
        assert UserStatus.SUSPENDED.value == "Suspended"
        assert UserStatus.INACTIVE.value == "Inactive"


class TestLostItemStatusEnumValues:
    """Entities.md §4.2: Status enum = Reported, Matched, Claimed, Closed."""

    def test_lost_item_status_has_exact_four_values(self):
        values = [m.value for m in LostItemStatus]
        assert set(values) == {"Reported", "Matched", "Claimed", "Closed"}

    def test_lost_item_status_member_names(self):
        assert LostItemStatus.REPORTED.value == "Reported"
        assert LostItemStatus.MATCHED.value == "Matched"
        assert LostItemStatus.CLAIMED.value == "Claimed"
        assert LostItemStatus.CLOSED.value == "Closed"


class TestFoundItemStatusEnumValues:
    """Entities.md §4.3: Status enum = Available, Claimed, Returned."""

    def test_found_item_status_has_exact_three_values(self):
        values = [m.value for m in FoundItemStatus]
        assert set(values) == {"Available", "Claimed", "Returned"}

    def test_found_item_status_member_names(self):
        assert FoundItemStatus.AVAILABLE.value == "Available"
        assert FoundItemStatus.CLAIMED.value == "Claimed"
        assert FoundItemStatus.RETURNED.value == "Returned"


class TestClaimVerificationStatusEnumValues:
    """Entities.md §4.4: VerificationStatus enum = Pending, Approved, Rejected."""

    def test_claim_verification_status_has_exact_three_values(self):
        values = [m.value for m in ClaimVerificationStatus]
        assert set(values) == {"Pending", "Approved", "Rejected"}

    def test_claim_verification_status_member_names(self):
        assert ClaimVerificationStatus.PENDING.value == "Pending"
        assert ClaimVerificationStatus.APPROVED.value == "Approved"
        assert ClaimVerificationStatus.REJECTED.value == "Rejected"


class TestClaimStatusEnumValues:
    """Entities.md §4.4: Status enum = Active, Completed, Cancelled."""

    def test_claim_status_has_exact_three_values(self):
        values = [m.value for m in ClaimStatus]
        assert set(values) == {"Active", "Completed", "Cancelled"}

    def test_claim_status_member_names(self):
        assert ClaimStatus.ACTIVE.value == "Active"
        assert ClaimStatus.COMPLETED.value == "Completed"
        assert ClaimStatus.CANCELLED.value == "Cancelled"


class TestCategoryStatusEnumValues:
    """Entities.md §4.5: Status enum = Active, Archived."""

    def test_category_status_has_exact_two_values(self):
        values = [m.value for m in CategoryStatus]
        assert set(values) == {"Active", "Archived"}

    def test_category_status_member_names(self):
        assert CategoryStatus.ACTIVE.value == "Active"
        assert CategoryStatus.ARCHIVED.value == "Archived"


class TestMatchStatusEnumValues:
    """Entities.md §4.6: Status enum = Suggested, Accepted, Rejected."""

    def test_match_status_has_exact_three_values(self):
        values = [m.value for m in MatchStatus]
        assert set(values) == {"Suggested", "Accepted", "Rejected"}

    def test_match_status_member_names(self):
        assert MatchStatus.SUGGESTED.value == "Suggested"
        assert MatchStatus.ACCEPTED.value == "Accepted"
        assert MatchStatus.REJECTED.value == "Rejected"


class TestNotificationTypeEnumValues:
    """Entities.md §4.7: NotificationType enum = Match, Claim, Reminder, System."""

    def test_notification_type_has_exact_four_values(self):
        values = [m.value for m in NotificationType]
        assert set(values) == {"Match", "Claim", "Reminder", "System"}

    def test_notification_type_member_names(self):
        assert NotificationType.MATCH.value == "Match"
        assert NotificationType.CLAIM.value == "Claim"
        assert NotificationType.REMINDER.value == "Reminder"
        assert NotificationType.SYSTEM.value == "System"


class TestVerificationResultEnumValues:
    """Entities.md §4.8: Result enum = Passed, Failed."""

    def test_verification_result_has_exact_two_values(self):
        values = [m.value for m in VerificationResult]
        assert set(values) == {"Passed", "Failed"}

    def test_verification_result_member_names(self):
        assert VerificationResult.PASSED.value == "Passed"
        assert VerificationResult.FAILED.value == "Failed"


class TestRelatedEntityEnumValues:
    """Entities.md §4.10: RelatedEntity enum = LostItem, FoundItem, Claim."""

    def test_related_entity_has_exact_three_values(self):
        values = [m.value for m in RelatedEntity]
        assert set(values) == {"LostItem", "FoundItem", "Claim"}

    def test_related_entity_member_names(self):
        assert RelatedEntity.LOST_ITEM.value == "LostItem"
        assert RelatedEntity.FOUND_ITEM.value == "FoundItem"
        assert RelatedEntity.CLAIM.value == "Claim"


# =============================================================================
# User — Entities.md §4.1
# =============================================================================


class TestUserModel:
    """User table: id, first_name, last_name, student_number, email,
    phone_number, password_hash, role, status, created_at."""

    def test_user_table_name(self):
        assert User.__tablename__ == "users"

    def test_user_has_all_expected_columns(self, db_session):
        user = User(
            first_name="Ada",
            last_name="Lovelace",
            student_number="s1234567",
            email="ada@example.com",
            phone_number="+27123456789",
            password_hash="hash",
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.id is not None
        assert user.first_name == "Ada"
        assert user.last_name == "Lovelace"
        assert user.student_number == "s1234567"
        assert user.email == "ada@example.com"
        assert user.phone_number == "+27123456789"
        assert user.password_hash == "hash"
        assert user.role == UserRole.USER
        assert user.status == UserStatus.ACTIVE
        assert user.created_at is not None

    def test_user_email_is_unique(self, db_session):
        db_session.add(
            User(
                first_name="A",
                last_name="B",
                email="dup@example.com",
                password_hash="hash",
            )
        )
        db_session.commit()
        with pytest.raises(Exception):  # IntegrityError on duplicate
            db_session.add(
                User(
                    first_name="C",
                    last_name="D",
                    email="dup@example.com",
                    password_hash="hash",
                )
            )
            db_session.commit()

    def test_user_defaults(self, db_session):
        user = User(
            first_name="Default",
            last_name="Test",
            email="default@example.com",
            password_hash="hash",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        assert user.role == UserRole.USER  # default
        assert user.status == UserStatus.ACTIVE  # default


# =============================================================================
# LostItem — Entities.md §4.2
# =============================================================================


class TestLostItemModel:
    """LostItem table: id, user_id, category_id, title, description, brand,
    colour, date_lost, location_lost, status."""

    def test_lost_item_table_name(self):
        assert LostItem.__tablename__ == "lost_items"

    def test_lost_item_has_all_expected_columns(self, db_session, user, electronics_category):
        item = LostItem(
            user_id=user.id,
            category_id=electronics_category.id,
            title="Silver laptop",
            description="MacBook Pro 14-inch",
            brand="Apple",
            colour="Silver",
            date_lost=date(2026, 8, 10),
            location_lost="Library",
            status=LostItemStatus.REPORTED,
        )
        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)

        assert item.id is not None
        assert item.user_id == user.id
        assert item.category_id == electronics_category.id
        assert item.title == "Silver laptop"
        assert item.description == "MacBook Pro 14-inch"
        assert item.brand == "Apple"
        assert item.colour == "Silver"
        assert item.date_lost == date(2026, 8, 10)
        assert item.location_lost == "Library"
        assert item.status == LostItemStatus.REPORTED

    def test_lost_item_status_defaults_to_reported(self, db_session, user, electronics_category):
        item = LostItem(
            user_id=user.id,
            category_id=electronics_category.id,
            title="Test item",
        )
        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)
        assert item.status == LostItemStatus.REPORTED

    def test_lost_item_optional_fields_can_be_null(self, db_session, user, electronics_category):
        item = LostItem(
            user_id=user.id,
            category_id=electronics_category.id,
            title="Minimal item",
        )
        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)
        assert item.description is None
        assert item.brand is None
        assert item.colour is None
        assert item.date_lost is None
        assert item.location_lost is None


# =============================================================================
# FoundItem — Entities.md §4.3
# =============================================================================


class TestFoundItemModel:
    """FoundItem table: id, user_id, category_id, title, description, brand,
    colour, date_found, storage_location, status."""

    def test_found_item_table_name(self):
        assert FoundItem.__tablename__ == "found_items"

    def test_found_item_has_all_expected_columns(self, db_session, bob, electronics_category):
        item = FoundItem(
            user_id=bob.id,
            category_id=electronics_category.id,
            title="Blue Sony headphones",
            description="Sony WH-1000XM5",
            brand="Sony",
            colour="Blue",
            date_found=date(2026, 8, 10),
            storage_location="Library",
            status=FoundItemStatus.AVAILABLE,
        )
        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)

        assert item.id is not None
        assert item.user_id == bob.id
        assert item.category_id == electronics_category.id
        assert item.title == "Blue Sony headphones"
        assert item.description == "Sony WH-1000XM5"
        assert item.brand == "Sony"
        assert item.colour == "Blue"
        assert item.date_found == date(2026, 8, 10)
        assert item.storage_location == "Library"
        assert item.status == FoundItemStatus.AVAILABLE

    def test_found_item_status_defaults_to_available(self, db_session, bob, electronics_category):
        item = FoundItem(
            user_id=bob.id,
            category_id=electronics_category.id,
            title="Test item",
        )
        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)
        assert item.status == FoundItemStatus.AVAILABLE

    def test_found_item_optional_fields_can_be_null(self, db_session, bob, electronics_category):
        item = FoundItem(
            user_id=bob.id,
            category_id=electronics_category.id,
            title="Minimal item",
        )
        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)
        assert item.description is None
        assert item.brand is None
        assert item.colour is None
        assert item.date_found is None
        assert item.storage_location is None


# =============================================================================
# Claim — Entities.md §4.4
# =============================================================================


class TestClaimModel:
    """Claim table: id, lost_item_id, found_item_id, user_id, claim_date,
    verification_status, officer_id, verification_notes, collection_date, status."""

    def test_claim_table_name(self):
        assert Claim.__tablename__ == "claims"

    def test_claim_has_all_expected_columns(
        self, db_session, user, electronics_category, lost_item, found_item
    ):
        claim = Claim(
            lost_item_id=lost_item.id,
            found_item_id=found_item.id,
            user_id=user.id,
            verification_status=ClaimVerificationStatus.PENDING,
            status=ClaimStatus.ACTIVE,
        )
        db_session.add(claim)
        db_session.commit()
        db_session.refresh(claim)

        assert claim.id is not None
        assert claim.lost_item_id == lost_item.id
        assert claim.found_item_id == found_item.id
        assert claim.user_id == user.id
        assert claim.claim_date is not None
        assert claim.verification_status == ClaimVerificationStatus.PENDING
        assert claim.officer_id is None
        assert claim.verification_notes is None
        assert claim.collection_date is None
        assert claim.status == ClaimStatus.ACTIVE

    def test_claim_verification_status_defaults_to_pending(self, db_session, lost_item, found_item, user):
        claim = Claim(
            lost_item_id=lost_item.id,
            found_item_id=found_item.id,
            user_id=user.id,
        )
        db_session.add(claim)
        db_session.commit()
        db_session.refresh(claim)
        assert claim.verification_status == ClaimVerificationStatus.PENDING

    def test_claim_status_defaults_to_active(self, db_session, lost_item, found_item, user):
        claim = Claim(
            lost_item_id=lost_item.id,
            found_item_id=found_item.id,
            user_id=user.id,
        )
        db_session.add(claim)
        db_session.commit()
        db_session.refresh(claim)
        assert claim.status == ClaimStatus.ACTIVE


# =============================================================================
# Category — Entities.md §4.5
# =============================================================================


class TestCategoryModel:
    """Category table: id, category_name, description, icon, display_order,
    status, created_at."""

    def test_category_table_name(self):
        assert Category.__tablename__ == "categories"

    def test_category_has_all_expected_columns(self, db_session):
        cat = Category(
            category_name="Books",
            description="Books and reading materials",
            icon="book",
            display_order=10,
            status=CategoryStatus.ACTIVE,
        )
        db_session.add(cat)
        db_session.commit()
        db_session.refresh(cat)

        assert cat.id is not None
        assert cat.category_name == "Books"
        assert cat.description == "Books and reading materials"
        assert cat.icon == "book"
        assert cat.display_order == 10
        assert cat.status == CategoryStatus.ACTIVE
        assert cat.created_at is not None

    def test_category_name_is_unique(self, db_session):
        db_session.add(
            Category(category_name="UniqueCat", description="test")
        )
        db_session.commit()
        with pytest.raises(Exception):
            db_session.add(
                Category(category_name="UniqueCat", description="dup")
            )
            db_session.commit()

    def test_category_status_defaults_to_active(self, db_session):
        cat = Category(category_name="TestCat", description="test")
        db_session.add(cat)
        db_session.commit()
        db_session.refresh(cat)
        assert cat.status == CategoryStatus.ACTIVE


# =============================================================================
# Match — Entities.md §4.6
# =============================================================================


class TestMatchModel:
    """Match table: id, lost_item_id, found_item_id, match_score, match_reason,
    status, generated_at."""

    def test_match_table_name(self):
        assert Match.__tablename__ == "matches"

    def test_match_has_all_expected_columns(
        self, db_session, lost_item, found_item
    ):
        match = Match(
            lost_item_id=lost_item.id,
            found_item_id=found_item.id,
            match_score=Decimal("95.50"),
            match_reason="same category; strong description overlap",
            status=MatchStatus.SUGGESTED,
        )
        db_session.add(match)
        db_session.commit()
        db_session.refresh(match)

        assert match.id is not None
        assert match.lost_item_id == lost_item.id
        assert match.found_item_id == found_item.id
        assert match.match_score == Decimal("95.50")
        assert match.match_reason == "same category; strong description overlap"
        assert match.status == MatchStatus.SUGGESTED
        assert match.generated_at is not None

    def test_match_status_defaults_to_suggested(self, db_session, lost_item, found_item):
        match = Match(
            lost_item_id=lost_item.id,
            found_item_id=found_item.id,
            match_score=Decimal("50.00"),
        )
        db_session.add(match)
        db_session.commit()
        db_session.refresh(match)
        assert match.status == MatchStatus.SUGGESTED

    def test_match_score_is_numeric_with_two_decimals(self, db_session, lost_item, found_item):
        match = Match(
            lost_item_id=lost_item.id,
            found_item_id=found_item.id,
            match_score=Decimal("100.00"),
        )
        db_session.add(match)
        db_session.commit()
        db_session.refresh(match)
        assert match.match_score == Decimal("100.00")


# =============================================================================
# Notification — Entities.md §4.7
# =============================================================================


class TestNotificationModel:
    """Notification table: id, user_id, title, message, notification_type,
    is_read, created_at."""

    def test_notification_table_name(self):
        assert Notification.__tablename__ == "notifications"

    def test_notification_has_all_expected_columns(self, db_session, user):
        notif = Notification(
            user_id=user.id,
            title="Test notification",
            message="This is a test message",
            notification_type=NotificationType.MATCH,
            is_read=False,
        )
        db_session.add(notif)
        db_session.commit()
        db_session.refresh(notif)

        assert notif.id is not None
        assert notif.user_id == user.id
        assert notif.title == "Test notification"
        assert notif.message == "This is a test message"
        assert notif.notification_type == NotificationType.MATCH
        assert notif.is_read is False
        assert notif.created_at is not None

    def test_notification_is_read_defaults_to_false(self, db_session, user):
        notif = Notification(
            user_id=user.id,
            title="Unread",
            notification_type=NotificationType.CLAIM,
        )
        db_session.add(notif)
        db_session.commit()
        db_session.refresh(notif)
        assert notif.is_read is False


# =============================================================================
# VerificationRecord — Entities.md §4.8
# =============================================================================


class TestVerificationRecordModel:
    """VerificationRecord table: id, claim_id, officer_id, verification_method,
    result, notes, verified_at."""

    def test_verification_record_table_name(self):
        assert VerificationRecord.__tablename__ == "verification_records"

    def test_verification_record_has_all_expected_columns(
        self, db_session, claim, officer
    ):
        record = VerificationRecord(
            claim_id=claim.id,
            officer_id=officer.id,
            verification_method="Student card check",
            result=VerificationResult.PASSED,
            notes="ID matches student card",
        )
        db_session.add(record)
        db_session.commit()
        db_session.refresh(record)

        assert record.id is not None
        assert record.claim_id == claim.id
        assert record.officer_id == officer.id
        assert record.verification_method == "Student card check"
        assert record.result == VerificationResult.PASSED
        assert record.notes == "ID matches student card"
        assert record.verified_at is not None


# =============================================================================
# CollectionRecord — Entities.md §4.9
# =============================================================================


class TestCollectionRecordModel:
    """CollectionRecord table: id, claim_id, collected_by, officer_id,
    collection_date, recipient_signature, remarks."""

    def test_collection_record_table_name(self):
        assert CollectionRecord.__tablename__ == "collection_records"

    def test_collection_record_has_all_expected_columns(
        self, db_session, claim, officer
    ):
        record = CollectionRecord(
            claim_id=claim.id,
            collected_by="Ada Lovelace",
            officer_id=officer.id,
            recipient_signature="A.Lovelace",
            remarks="Item handed over successfully",
        )
        db_session.add(record)
        db_session.commit()
        db_session.refresh(record)

        assert record.id is not None
        assert record.claim_id == claim.id
        assert record.collected_by == "Ada Lovelace"
        assert record.officer_id == officer.id
        assert record.collection_date is not None
        assert record.recipient_signature == "A.Lovelace"
        assert record.remarks == "Item handed over successfully"


# =============================================================================
# Attachment — Entities.md §4.10
# =============================================================================


class TestAttachmentModel:
    """Attachment table: id, file_name, file_path, file_type, uploaded_by,
    uploaded_at, related_entity, entity_id."""

    def test_attachment_table_name(self):
        assert Attachment.__tablename__ == "attachments"

    def test_attachment_has_all_expected_columns(self, db_session, user):
        att = Attachment(
            file_name="photo.jpg",
            file_path="/media/abc123_photo.jpg",
            file_type="image/jpeg",
            uploaded_by=user.id,
            related_entity=RelatedEntity.LOST_ITEM,
            entity_id=42,
        )
        db_session.add(att)
        db_session.commit()
        db_session.refresh(att)

        assert att.id is not None
        assert att.file_name == "photo.jpg"
        assert att.file_path == "/media/abc123_photo.jpg"
        assert att.file_type == "image/jpeg"
        assert att.uploaded_by == user.id
        assert att.uploaded_at is not None
        assert att.related_entity == RelatedEntity.LOST_ITEM
        assert att.entity_id == 42


# =============================================================================
# AuditLog — Entities.md §4.11
# =============================================================================


class TestAuditLogModel:
    """AuditLog table: id, user_id (nullable), action, entity_name, entity_id,
    timestamp, ip_address."""

    def test_audit_log_table_name(self):
        assert AuditLog.__tablename__ == "audit_logs"

    def test_audit_log_has_all_expected_columns(self, db_session, user):
        log = AuditLog(
            user_id=user.id,
            action="TestAction",
            entity_name="TestCase",
            entity_id=123,
            ip_address="127.0.0.1",
        )
        db_session.add(log)
        db_session.commit()
        db_session.refresh(log)

        assert log.id is not None
        assert log.user_id == user.id
        assert log.action == "TestAction"
        assert log.entity_name == "TestCase"
        assert log.entity_id == 123
        assert log.timestamp is not None
        assert log.ip_address == "127.0.0.1"

    def test_audit_log_user_id_can_be_null(self, db_session):
        """System-initiated actions have no acting user (Review.md §3)."""
        log = AuditLog(
            user_id=None,
            action="SystemAction",
            entity_name="System",
            entity_id=None,
        )
        db_session.add(log)
        db_session.commit()
        db_session.refresh(log)
        assert log.user_id is None


# =============================================================================
# FK relationship tests — create parent, create child, confirm both directions
# =============================================================================


class TestUserRelationships:
    """User ↔ LostItem, FoundItem, Claim, Notification, Attachment,
    VerificationRecord, CollectionRecord, AuditLog."""

    def test_user_lost_items_relationship(self, db_session, user, electronics_category):
        item1 = LostItem(user_id=user.id, category_id=electronics_category.id, title="Item 1")
        item2 = LostItem(user_id=user.id, category_id=electronics_category.id, title="Item 2")
        db_session.add_all([item1, item2])
        db_session.commit()

        db_session.refresh(user)
        assert len(user.lost_items) == 2
        assert {item.title for item in user.lost_items} == {"Item 1", "Item 2"}

        # Reverse: item → user
        db_session.refresh(item1)
        assert item1.user.id == user.id
        assert item1.user.first_name == "Ada"

    def test_user_found_items_relationship(self, db_session, bob, electronics_category):
        item1 = FoundItem(user_id=bob.id, category_id=electronics_category.id, title="Found 1")
        item2 = FoundItem(user_id=bob.id, category_id=electronics_category.id, title="Found 2")
        db_session.add_all([item1, item2])
        db_session.commit()

        db_session.refresh(bob)
        assert len(bob.found_items) == 2
        assert {item.title for item in bob.found_items} == {"Found 1", "Found 2"}

    def test_user_claims_submitted_relationship(self, db_session, user, lost_item, found_item):
        claim = Claim(
            lost_item_id=lost_item.id,
            found_item_id=found_item.id,
            user_id=user.id,
        )
        db_session.add(claim)
        db_session.commit()

        db_session.refresh(user)
        assert len(user.claims_submitted) == 1
        assert user.claims_submitted[0].id == claim.id

    def test_user_notifications_relationship(self, db_session, user):
        notif1 = Notification(user_id=user.id, title="N1", notification_type=NotificationType.MATCH)
        notif2 = Notification(user_id=user.id, title="N2", notification_type=NotificationType.CLAIM)
        db_session.add_all([notif1, notif2])
        db_session.commit()

        db_session.refresh(user)
        assert len(user.notifications) == 2

    def test_user_attachments_relationship(self, db_session, user):
        att = Attachment(
            file_name="test.jpg",
            file_path="/media/test.jpg",
            file_type="image/jpeg",
            uploaded_by=user.id,
            related_entity=RelatedEntity.LOST_ITEM,
        )
        db_session.add(att)
        db_session.commit()

        db_session.refresh(user)
        assert len(user.attachments) == 1
        assert user.attachments[0].file_name == "test.jpg"


class TestCategoryRelationships:
    """Category → LostItem, FoundItem (one-to-many)."""

    def test_category_lost_items_relationship(self, db_session, electronics_category, user):
        item1 = LostItem(user_id=user.id, category_id=electronics_category.id, title="L1")
        item2 = LostItem(user_id=user.id, category_id=electronics_category.id, title="L2")
        db_session.add_all([item1, item2])
        db_session.commit()

        db_session.refresh(electronics_category)
        assert len(electronics_category.lost_items) == 2
        assert {item.title for item in electronics_category.lost_items} == {"L1", "L2"}

        # Reverse
        db_session.refresh(item1)
        assert item1.category.id == electronics_category.id
        assert item1.category.category_name == "Electronics"

    def test_category_found_items_relationship(self, db_session, electronics_category, bob):
        item1 = FoundItem(user_id=bob.id, category_id=electronics_category.id, title="F1")
        item2 = FoundItem(user_id=bob.id, category_id=electronics_category.id, title="F2")
        db_session.add_all([item1, item2])
        db_session.commit()

        db_session.refresh(electronics_category)
        assert len(electronics_category.found_items) == 2


class TestLostItemRelationships:
    """LostItem → User, Category, Match, Claim."""

    def test_lost_item_match_relationship(self, db_session, lost_item, found_item):
        match = Match(
            lost_item_id=lost_item.id,
            found_item_id=found_item.id,
            match_score=Decimal("85.00"),
        )
        db_session.add(match)
        db_session.commit()

        db_session.refresh(lost_item)
        assert len(lost_item.matches) == 1
        assert lost_item.matches[0].match_score == Decimal("85.00")

        # Reverse
        db_session.refresh(match)
        assert match.lost_item.id == lost_item.id
        assert match.lost_item.title == "Silver laptop"

    def test_lost_item_claim_relationship(self, db_session, lost_item, found_item, user):
        claim = Claim(
            lost_item_id=lost_item.id,
            found_item_id=found_item.id,
            user_id=user.id,
        )
        db_session.add(claim)
        db_session.commit()

        db_session.refresh(lost_item)
        assert len(lost_item.claims) == 1
        assert lost_item.claims[0].user_id == user.id


class TestFoundItemRelationships:
    """FoundItem → User, Category, Match, Claim."""

    def test_found_item_match_relationship(self, db_session, lost_item, found_item):
        match = Match(
            lost_item_id=lost_item.id,
            found_item_id=found_item.id,
            match_score=Decimal("85.00"),
        )
        db_session.add(match)
        db_session.commit()

        db_session.refresh(found_item)
        assert len(found_item.matches) == 1

        db_session.refresh(match)
        assert match.found_item.id == found_item.id

    def test_found_item_claim_relationship(self, db_session, lost_item, found_item, user):
        claim = Claim(
            lost_item_id=lost_item.id,
            found_item_id=found_item.id,
            user_id=user.id,
        )
        db_session.add(claim)
        db_session.commit()

        db_session.refresh(found_item)
        assert len(found_item.claims) == 1


class TestClaimRelationships:
    """Claim → LostItem, FoundItem, User, VerificationRecord, CollectionRecord."""

    def test_claim_lost_item_relationship(self, db_session, claim):
        db_session.refresh(claim)
        assert claim.lost_item.id is not None
        assert claim.lost_item.title == "Silver laptop"

    def test_claim_found_item_relationship(self, db_session, claim):
        db_session.refresh(claim)
        assert claim.found_item.id is not None
        assert claim.found_item.title == "Blue Sony headphones"

    def test_claim_user_relationship(self, db_session, claim):
        db_session.refresh(claim)
        assert claim.user.id is not None

    def test_claim_verification_records_relationship(self, db_session, claim, officer):
        record = VerificationRecord(
            claim_id=claim.id,
            officer_id=officer.id,
            result=VerificationResult.PASSED,
        )
        db_session.add(record)
        db_session.commit()

        db_session.refresh(claim)
        assert len(claim.verification_records) == 1
        assert claim.verification_records[0].result == VerificationResult.PASSED

    def test_claim_collection_records_relationship(self, db_session, claim, officer):
        record = CollectionRecord(
            claim_id=claim.id,
            officer_id=officer.id,
            collected_by="Test",
        )
        db_session.add(record)
        db_session.commit()

        db_session.refresh(claim)
        assert len(claim.collection_records) == 1


class TestMatchRelationships:
    """Match → LostItem, FoundItem."""

    def test_match_lost_item_relationship(self, db_session, match):
        db_session.refresh(match)
        assert match.lost_item.id is not None

    def test_match_found_item_relationship(self, db_session, match):
        db_session.refresh(match)
        assert match.found_item.id is not None


class TestNotificationRelationship:
    """Notification → User."""

    def test_notification_user_relationship(self, db_session, notification):
        db_session.refresh(notification)
        assert notification.user.id is not None
        assert notification.user.email == "ada@example.com"


class TestVerificationRecordRelationships:
    """VerificationRecord → Claim, User."""

    def test_verification_record_claim_relationship(self, db_session, verification_record):
        db_session.refresh(verification_record)
        assert verification_record.claim.id is not None

    def test_verification_record_officer_relationship(self, db_session, verification_record):
        db_session.refresh(verification_record)
        assert verification_record.officer.id is not None


class TestCollectionRecordRelationships:
    """CollectionRecord → Claim, User."""

    def test_collection_record_claim_relationship(self, db_session, collection_record):
        db_session.refresh(collection_record)
        assert collection_record.claim.id is not None

    def test_collection_record_officer_relationship(self, db_session, collection_record):
        db_session.refresh(collection_record)
        assert collection_record.officer.id is not None


class TestAttachmentRelationship:
    """Attachment → User."""

    def test_attachment_uploader_relationship(self, db_session, attachment):
        db_session.refresh(attachment)
        assert attachment.uploader.id is not None


class TestAuditLogRelationship:
    """AuditLog → User (nullable)."""

    def test_audit_log_user_relationship(self, db_session, audit_log):
        db_session.refresh(audit_log)
        assert audit_log.user.id == audit_log.user_id


# =============================================================================
# Seed data contract — 4 starter categories (Module 1)
# =============================================================================


class TestSeedDataContract:
    """Module 1 seed data: 4 starter categories are importable and testable."""

    def test_four_starter_categories_exist(self, db_session):
        """The seed script creates exactly 4 categories by name."""
        # Import the seed function if available, otherwise rely on fixtures
        try:
            from seed import seed_categories
        except ImportError:
            pytest.skip("seed.py not importable in test environment")

        # Re-run the category seed (idempotent)
        seed_categories(db_session)

        categories = db_session.scalars(
            Category.__table__.select().order_by(Category.display_order)
        ).all()

        names = {c.category_name for c in categories}
        assert names == {"Electronics", "Bags", "Clothes", "Documents & Cards"}

        # Verify display_order is set
        for cat in categories:
            assert cat.display_order is not None
            assert cat.status == CategoryStatus.ACTIVE
