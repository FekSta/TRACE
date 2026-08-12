"""Attachment upload + media serving (Module 3, issue 2).

- Uploads go **only** through ``app.modules.items.storage`` — no direct
  filesystem calls here or anywhere else in the Items module.
- The ``Attachment`` row stores the returned **URL** (``/media/<name>``),
  never the file bytes.
- ``RelatedEntity`` is inferred from the route (``/items/lost/{id}/...`` →
  LostItem, ``/items/found/{id}/...`` → FoundItem) and the polymorphic
  ``entity_id`` column links the attachment to the item (interpretation of
  `Entities.md`, recorded in `Review.md` §Module 3).
- ``/media/{filename}`` is public by design (Phase 1): filenames contain an
  unguessable UUID prefix, which is the access control; see `Review.md`.
"""

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Attachment, FoundItem, LostItem, User
from app.models.enums import RelatedEntity
from app.modules.auth.deps import get_current_user
from app.modules.items.schemas import AttachmentResponse
from app.modules.items.service import get_scoped
from app.modules.items.storage import storage

router = APIRouter(tags=["items"])


async def _save_attachment(
    db: Session,
    file: UploadFile,
    related_entity: RelatedEntity,
    entity_id: int,
    user: User,
) -> Attachment:
    original = Path(file.filename or "upload").name  # strip any path components
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    stored_name = storage.save(content, original)
    attachment = Attachment(
        file_name=original,
        file_path=storage.get_url(stored_name),
        file_type=file.content_type or "application/octet-stream",
        uploaded_by=user.id,
        related_entity=related_entity,
        entity_id=entity_id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.post(
    "/items/lost/{item_id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_lost_item_attachment(
    item_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Attachment:
    """Upload an attachment for a lost item (owner, or Officer/Admin for any)."""
    item = get_scoped(db, LostItem, item_id, current_user)
    return await _save_attachment(db, file, RelatedEntity.LOST_ITEM, item.id, current_user)


@router.post(
    "/items/found/{item_id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_found_item_attachment(
    item_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Attachment:
    """Upload an attachment for a found item (owner, or Officer/Admin for any)."""
    item = get_scoped(db, FoundItem, item_id, current_user)
    return await _save_attachment(db, file, RelatedEntity.FOUND_ITEM, item.id, current_user)


@router.get("/media/{filename}", include_in_schema=False)
def serve_media(filename: str) -> FileResponse:
    """Serve a stored file. Public in Phase 1; UUID-prefixed names prevent
    enumeration. Path traversal is blocked: the resolved file must sit
    directly inside the uploads directory."""
    root = storage.base_dir.resolve()  # type: ignore[attr-defined]
    path = (root / filename).resolve()
    if path.parent != root or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return FileResponse(path)
