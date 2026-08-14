from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import require_roles
from app.services.tornei.point_adjustments import (
    create_point_adjustment,
    delete_point_adjustment,
    get_point_adjustments,
)
from app.controllers.tornei.schemas.point_adjustments import (
    CreatePointAdjustment,
    PointAdjustmentResponse,
)

router = APIRouter(prefix="/point-adjustments", tags=["Point Adjustments"])


@router.get("", response_model=list[PointAdjustmentResponse])
def all_point_adjustments(db: Session = Depends(get_db)):
    """Pubblico, nessun filtro: il frontend carica tutto in blocco e
    raggruppa per torneo, stesso pattern di /races e /results."""
    return get_point_adjustments(db)


@router.post("", response_model=PointAdjustmentResponse, status_code=201)
def insert_point_adjustment(
    payload: CreatePointAdjustment,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    try:
        return create_point_adjustment(
            db,
            tournament_id=payload.tournament_id,
            player_id=payload.player_id,
            points=payload.points,
            reason=payload.reason,
            actor_user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{adjustment_id}")
def delete_point_adjustment_by_id(
    adjustment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    deleted = delete_point_adjustment(db, adjustment_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Point adjustment not found"
        )
    return {"message": "Point adjustment deleted successfully"}
