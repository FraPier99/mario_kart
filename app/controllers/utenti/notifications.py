from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.services.utenti.notifications import (
    get_user_notifications,
    mark_all_read,
    mark_read,
    unread_count,
    delete_notification,
    delete_read_notifications,
    delete_all_notifications,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def list_notifications(
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    return {
        "notifications": get_user_notifications(db, current_user.id),
        "unread": unread_count(db, current_user.id),
    }


@router.patch("/{notification_id}/read")
def read_one(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mark_read(db, notification_id, current_user.id)
    return {"ok": True}


@router.patch("/read-all")
def read_all(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    mark_all_read(db, current_user.id)
    return {"ok": True}


@router.delete("/read")
def delete_read(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Elimina le notifiche già lette (pulizia automatica all'apertura)."""
    return {"ok": True, "deleted": delete_read_notifications(db, current_user.id)}


@router.delete("")
def delete_all(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Elimina tutte le notifiche dell'utente ('Cancella tutte')."""
    return {"ok": True, "deleted": delete_all_notifications(db, current_user.id)}


@router.delete("/{notification_id}")
def delete_one(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = delete_notification(db, notification_id, current_user.id)
    if not deleted:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Notifica non trovata")
    return {"ok": True}
