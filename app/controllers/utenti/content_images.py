from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.media import decode_data_url, to_image_url
from app.core.security import require_roles
from app.controllers.utenti.schemas.content_images import (
    ContentImageResponse,
    UploadContentImagePayload,
)
from app.services.utenti.content_images import (
    delete_content_image,
    get_content_image,
    list_content_images,
    upsert_content_image,
)

router = APIRouter(prefix="/content-images", tags=["ContentImages"])


def _image_url(key: str, image_data: str | None) -> str | None:
    return to_image_url(f"/content-images/{key}/raw", image_data)


@router.get("", response_model=list[ContentImageResponse])
def list_images(db: Session = Depends(get_db)):
    return [
        {"key": row.key, "image_url": _image_url(row.key, row.image_data)}
        for row in list_content_images(db)
    ]


@router.get("/{key}/raw")
def get_image_raw(key: str, db: Session = Depends(get_db)):
    row = get_content_image(db, key)
    if not row or not row.image_data or not row.image_data.startswith("data:"):
        raise HTTPException(status_code=404, detail="Immagine non disponibile")
    mime, raw_bytes = decode_data_url(row.image_data)
    return Response(
        content=raw_bytes,
        media_type=mime,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.put("/{key}", response_model=ContentImageResponse)
def upload_image(
    key: str,
    payload: UploadContentImagePayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin")),
):
    row = upsert_content_image(db, key, payload.image_data, current_user.id)
    return {"key": row.key, "image_url": _image_url(row.key, row.image_data)}


@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
def remove_image(
    key: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin")),
):
    delete_content_image(db, key)
