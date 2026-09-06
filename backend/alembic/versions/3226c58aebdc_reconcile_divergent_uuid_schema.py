"""reconcile divergent UUID schema by dropping stale singular tables

Revision ID: 3226c58aebdc
Revises: 13049a14c583
Create Date: 2026-09-05 18:45:28.883118

"""
from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "3226c58aebdc"
down_revision: str | Sequence[str] | None = "13049a14c583"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Remove the obsolete singular-table, UUID-id schema.

    The canonical schema is the plural, integer-id schema created by
    ``405c749934b5`` and extended by ``60ec8bad202b``.
    """
    op.drop_table("verification_record")
    op.drop_table("collection_record")
    op.drop_table("match")
    op.drop_table("claim")
    op.drop_table("notification")
    op.drop_table("lost_item")
    op.drop_table("found_item")
    op.drop_table("audit_log")
    op.drop_table("attachment")
    op.drop_table("user")
    op.drop_table("category")

    for enum in (
        "verificationresult",
        "claimstatus",
        "founditemstatus",
        "lostitemstatus",
        "matchstatus",
        "notificationtype",
        "verificationstatus",
        "relatedentity",
        "userstatus",
        "role",
        "categorystatus",
    ):
        op.execute(f"DROP TYPE IF EXISTS {enum}")


def downgrade() -> None:
    """Do not recreate the obsolete schema on downgrade."""
