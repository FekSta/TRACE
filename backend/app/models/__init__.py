"""TRACE ORM models — a single shared package for all 11 entities.

Per the Module 1 issue: one shared ``backend/app/models/`` package, not one
package per module. Importing this package registers every model on
``app.db.Base.metadata``, which is what Alembic autogenerate reads.
"""

from app.models.attachment import Attachment
from app.models.audit_log import AuditLog
from app.models.category import Category
from app.models.claim import Claim
from app.models.collection_record import CollectionRecord
from app.models.found_item import FoundItem
from app.models.lost_item import LostItem
from app.models.match import Match
from app.models.notification import Notification
from app.models.user import User
from app.models.verification_record import VerificationRecord

__all__ = [
    "Attachment",
    "AuditLog",
    "Category",
    "Claim",
    "CollectionRecord",
    "FoundItem",
    "LostItem",
    "Match",
    "Notification",
    "User",
    "VerificationRecord",
]
