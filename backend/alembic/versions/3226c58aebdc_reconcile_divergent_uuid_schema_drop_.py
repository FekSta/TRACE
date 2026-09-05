"""reconcile divergent uuid schema: drop stale singular tables

Revision ID: 3226c58aebdc
Revises: 13049a14c583
Create Date: 2026-09-05 18:45:28.883118

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '3226c58aebdc'
down_revision: Union[str, Sequence[str], None] = '13049a14c583'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop the stale singular-table, UUID-id schema.

    ``ff0a486902ce`` was an independent initial migration branched from the
    same base as ``405c749934b5``. It created the same 11 entities under
    singular names (``user``, ``category``, …) with ``*_id`` UUID primary keys
    from a superseded model design; the canonical schema is the plural,
    integer-id one created by ``405c749934b5`` (+ ``60ec8bad202b``). Merging
    the two leaves both in place, so the conflict is resolved here on top of
    the merge by dropping the stale tables (children first) and their
    orphaned enum types.
    """
    op.drop_table('verification_record')
    op.drop_table('collection_record')
    op.drop_table('match')
    op.drop_table('claim')
    op.drop_table('notification')
    op.drop_table('lost_item')
    op.drop_table('found_item')
    op.drop_table('audit_log')
    op.drop_table('attachment')
    op.drop_table('user')
    op.drop_table('category')

    for enum in (
        'verificationresult',
        'claimstatus',
        'founditemstatus',
        'lostitemstatus',
        'matchstatus',
        'notificationtype',
        'verificationstatus',
        'relatedentity',
        'userstatus',
        'role',
        'categorystatus',
    ):
        op.execute(f'DROP TYPE IF EXISTS {enum}')


def downgrade() -> None:
    """No-op: the stale UUID schema is obsolete and is not recreated."""
    pass