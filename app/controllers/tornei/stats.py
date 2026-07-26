from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.controllers.tornei.schemas.stats import (
    CircuitStatsDetailResponse,
    CircuitStatsListItem,
    HeadToHeadResponse,
)
from app.models import Circuit, Player
from app.services.tornei.stats import (
    get_circuit_stats_detail,
    get_circuit_stats_list,
    get_head_to_head_by_circuit,
    get_head_to_head_history,
    get_head_to_head_summary,
)

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/head-to-head", response_model=HeadToHeadResponse)
def head_to_head(
    game_id: int,
    player_a_id: int,
    player_b_id: int,
    db: Session = Depends(get_db),
):
    if player_a_id == player_b_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="player_a_id e player_b_id devono essere diversi",
        )

    player_a = db.query(Player).filter(Player.id == player_a_id).first()
    player_b = db.query(Player).filter(Player.id == player_b_id).first()
    if not player_a or not player_b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Giocatore non trovato")

    return {
        "player_a": {"id": player_a.id, "nickname": player_a.nickname},
        "player_b": {"id": player_b.id, "nickname": player_b.nickname},
        "summary": get_head_to_head_summary(db, game_id, player_a_id, player_b_id),
        "by_circuit": get_head_to_head_by_circuit(db, game_id, player_a_id, player_b_id),
        "history": get_head_to_head_history(db, game_id, player_a_id, player_b_id),
    }


@router.get("/circuits", response_model=list[CircuitStatsListItem])
def circuit_stats_list(game_id: int, db: Session = Depends(get_db)):
    return get_circuit_stats_list(db, game_id)


@router.get("/circuits/{circuit_id}", response_model=CircuitStatsDetailResponse)
def circuit_stats_detail(circuit_id: int, db: Session = Depends(get_db)):
    circuit = db.query(Circuit).filter(Circuit.id == circuit_id).first()
    if not circuit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Circuito non trovato")

    return {
        "circuit_id": circuit_id,
        "ranking": get_circuit_stats_detail(db, circuit_id),
    }
