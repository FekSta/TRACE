"""Enumerations for the TRACE models.

Two layers:

- Python ``enum.Enum`` classes whose **values** are the exact strings from
  ``assets/diagrams/data-model.md`` (case-sensitive, e.g. ``User``, not ``USER``).
- SQLAlchemy ``Enum`` column types (native Postgres enums) built from those
  classes via ``values_callable`` so the database stores the exact value
  strings, never the uppercase Python member names.

Adding or removing an enum value later requires a migration (native Postgres
enum) — accepted for V1, see ``Review.md`` §4.
"""

import enum

from sqlalchemy import Enum as SAEnum


def _values(cls: type[enum.Enum]) -> list[str]:
    """Return the member *values* of an enum class for DB storage."""
    return [m.value for m in cls]


# --- Python enums (values match Entities.md exactly) ---------------------

class UserRole(str, enum.Enum):
    USER = "User"
    OFFICER = "Officer"
    ADMINISTRATOR = "Administrator"


class UserStatus(str, enum.Enum):
    ACTIVE = "Active"
    SUSPENDED = "Suspended"
    INACTIVE = "Inactive"


class LostItemStatus(str, enum.Enum):
    REPORTED = "Reported"
    MATCHED = "Matched"
    CLAIMED = "Claimed"
    CLOSED = "Closed"


class FoundItemStatus(str, enum.Enum):
    AVAILABLE = "Available"
    CLAIMED = "Claimed"
    RETURNED = "Returned"


class ClaimVerificationStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"


class ClaimStatus(str, enum.Enum):
    ACTIVE = "Active"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class CategoryStatus(str, enum.Enum):
    ACTIVE = "Active"
    ARCHIVED = "Archived"


class MatchStatus(str, enum.Enum):
    SUGGESTED = "Suggested"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"


class NotificationType(str, enum.Enum):
    MATCH = "Match"
    CLAIM = "Claim"
    REMINDER = "Reminder"
    SYSTEM = "System"


class VerificationResult(str, enum.Enum):
    PASSED = "Passed"
    FAILED = "Failed"


class RelatedEntity(str, enum.Enum):
    LOST_ITEM = "LostItem"
    FOUND_ITEM = "FoundItem"
    CLAIM = "Claim"


# --- SQLAlchemy native-Postgres-enum column types ------------------------

UserRoleType = SAEnum(UserRole, name="user_role", values_callable=_values)
UserStatusType = SAEnum(UserStatus, name="user_status", values_callable=_values)
LostItemStatusType = SAEnum(LostItemStatus, name="lost_item_status", values_callable=_values)
FoundItemStatusType = SAEnum(FoundItemStatus, name="found_item_status", values_callable=_values)
ClaimVerificationStatusType = SAEnum(
    ClaimVerificationStatus, name="claim_verification_status", values_callable=_values
)
ClaimStatusType = SAEnum(ClaimStatus, name="claim_status", values_callable=_values)
CategoryStatusType = SAEnum(CategoryStatus, name="category_status", values_callable=_values)
MatchStatusType = SAEnum(MatchStatus, name="match_status", values_callable=_values)
NotificationTypeType = SAEnum(NotificationType, name="notification_type", values_callable=_values)
VerificationResultType = SAEnum(VerificationResult, name="verification_result", values_callable=_values)
RelatedEntityType = SAEnum(RelatedEntity, name="related_entity", values_callable=_values)
