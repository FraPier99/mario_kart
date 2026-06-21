from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import require_roles, get_current_user
from app.services.schedine.schedine_deluxe import (
    create_schedina_deluxe,
    get_schedine_deluxe,
    get_tournament_schedina_deluxe_detail,
    settle_deluxe_schedine,
)
from app.models import Tournament
from app.controllers.schedine.schemas.schedine_deluxe import (
    SchedinaDeluxeTournamentDetailResponse,
    SchedinaTorneoGroupStageCreate,
    SchedinaTorneoGroupStageResponse,
)

router = APIRouter(prefix="/schedine-deluxe", tags=["SchedineDeluxe"])


@router.post("", response_model=SchedinaTorneoGroupStageResponse, status_code=201)
def submit_schedina_deluxe(
    payload: SchedinaTorneoGroupStageCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Compila la schedina deluxe per il torneo specificato."""
    try:
        return create_schedina_deluxe(db, current_user.id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hai già compilato la schedina per questo torneo",
        )


@router.get("/me", response_model=list[SchedinaTorneoGroupStageResponse])
def get_my_schedine_deluxe(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Restituisce tutte le schedine deluxe dell'utente corrente."""
    return get_schedine_deluxe(db, user_id=current_user.id)


@router.get("/tournament/{tournament_id}", response_model=list[SchedinaTorneoGroupStageResponse])
def get_schedine_by_tournament(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    """Restituisce tutte le schedine deluxe di un torneo (solo admin)."""
    return get_schedine_deluxe(db, tournament_id=tournament_id)


@router.get(
    "/tournament/{tournament_id}/detail",
    response_model=SchedinaDeluxeTournamentDetailResponse,
)
def get_schedine_deluxe_detail_endpoint(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Classifica live (o liquidata) delle schedine a gironi, con dettaglio punteggio."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    result = get_tournament_schedina_deluxe_detail(db, tournament_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    result["user_has_predicted"] = bool(
        get_schedine_deluxe(db, user_id=current_user.id, tournament_id=tournament_id)
    )
    return result


@router.post("/tournament/{tournament_id}/settle")
def settle_schedine_endpoint(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin")),
):
    """
    Liquida tutte le schedine deluxe del torneo e restituisce la classifica.
    Richiede che winner_id e consolation_winner_id siano già impostati sul torneo.
    """
    try:
        return settle_deluxe_schedine(db, tournament_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
