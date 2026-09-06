"""merge heads

Revision ID: 13049a14c583
Revises: 60ec8bad202b, ff0a486902ce
Create Date: 2026-09-05 18:45:10.483371

"""
from collections.abc import Sequence


# revision identifiers, used by Alembic.
revision: str = "13049a14c583"
down_revision: str | Sequence[str] | None = (
    "60ec8bad202b",
    "ff0a486902ce",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Merge the canonical and superseded migration branches."""


def downgrade() -> None:
    """Keep the merge revision reversible without changing the schema."""
