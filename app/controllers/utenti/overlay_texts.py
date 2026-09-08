from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import require_roles
from app.controllers.utenti.schemas.overlay_texts import (
    OverlayTextResponse,
    UploadOverlayTextPayload,
)
from app.services.utenti.overlay_texts import (
    get_overlay_text,
    list_overlay_texts,
    upsert_overlay_text,
)

router = APIRouter(prefix="/overlay-texts", tags=["OverlayTexts"])


@router.get("", response_model=list[OverlayTextResponse])
def list_texts(db: Session = Depends(get_db)):
    return [{"key": row.key, "data": row.data} for row in list_overlay_texts(db)]


@router.get("/{key}", response_model=OverlayTextResponse)
def get_text(key: str, db: Session = Depends(get_db)):
    row = get_overlay_text(db, key)
    return {"key": key, "data": row.data if row else None}


@router.put("/{key}", response_model=OverlayTextResponse)
def upload_text(
    key: str,
    payload: UploadOverlayTextPayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin")),
):
    row = upsert_overlay_text(db, key, payload.data, current_user.id)
    return {"key": row.key, "data": row.data}
