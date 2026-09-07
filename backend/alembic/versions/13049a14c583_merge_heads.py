"""merge heads

Revision ID: 13049a14c583
Revises: 60ec8bad202b, ff0a486902ce
Create Date: 2026-09-05 18:45:10.483371

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '13049a14c583'
down_revision: Union[str, Sequence[str], None] = ('60ec8bad202b', 'ff0a486902ce')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
