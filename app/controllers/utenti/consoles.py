from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import require_roles
from app.services.utenti.consoles import (
    create_console,
    delete_console,
    get_all_consoles,
    update_console,
)
from app.controllers.utenti.schemas.consoles import (
    ConsoleResponse,
    CreateConsole,
    UpdateConsole,
)

router = APIRouter(prefix="/consoles", tags=["Consoles"])


@router.get("", response_model=list[ConsoleResponse])
def list_consoles(db: Session = Depends(get_db)):
    return get_all_consoles(db)


@router.post("", response_model=ConsoleResponse, status_code=201)
def insert_console(
    payload: CreateConsole,
    current_user=Depends(require_roles("superadmin")),
    db: Session = Depends(get_db),
):
    try:
        return create_console(db, payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esiste già una console con questa chiave",
        )


@router.put("/{console_id}", response_model=ConsoleResponse)
def update_console_by_id(
    console_id: int,
    payload: UpdateConsole,
    current_user=Depends(require_roles("superadmin")),
    db: Session = Depends(get_db),
):
    console = update_console(db, console_id, payload)
    if not console:
        raise HTTPException(status_code=404, detail="Console non trovata")
    return console


@router.delete("/{console_id}", status_code=204)
def delete_console_by_id(
    console_id: int,
    current_user=Depends(require_roles("superadmin")),
    db: Session = Depends(get_db),
):
    console = delete_console(db, console_id)
    if not console:
        raise HTTPException(status_code=404, detail="Console non trovata")
