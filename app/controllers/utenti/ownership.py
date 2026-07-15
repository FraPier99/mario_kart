from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user, require_roles
from app.controllers.utenti.schemas.ownership import UpdateOwnershipRequest
from app.services.utenti.ownership import (
    get_all_ownership,
    get_my_ownership,
    replace_my_ownership,
)

router = APIRouter(prefix="/ownership", tags=["Ownership"])


@router.get("/me")
def read_my_ownership(
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    return get_my_ownership(db, current_user.id)


@router.put("/me")
def update_my_ownership(
    body: UpdateOwnershipRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return replace_my_ownership(
            db,
            current_user.id,
            games=body.games,
            consoles=body.consoles,
            r4_device_quantities=body.r4_devices,
        )
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(error))


@router.get("/all")
def read_all_ownership(
    current_user=Depends(require_roles("superadmin")),
    db: Session = Depends(get_db),
):
    return get_all_ownership(db)
