"""
TRACE Models — All 11 persistent entities.

Core Business Layer: User, LostItem, FoundItem, Claim, Category
Supporting Layer: Match, Notification, VerificationRecord, CollectionRecord, Attachment, AuditLog
"""

from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.category import Category
from backend.app.models.lost_item import LostItem
from backend.app.models.found_item import FoundItem
from backend.app.models.claim import Claim
from backend.app.models.match import Match
from backend.app.models.notification import Notification
from backend.app.models.verification_record import VerificationRecord
from backend.app.models.collection_record import CollectionRecord
from backend.app.models.attachment import Attachment
from backend.app.models.audit_log import AuditLog

__all__ = [
    "Base",
    "User",
    "Category",
    "LostItem",
    "FoundItem",
    "Claim",
    "Match",
    "Notification",
    "VerificationRecord",
    "CollectionRecord",
    "Attachment",
    "AuditLog",
]
