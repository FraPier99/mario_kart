from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.controllers.tornei.schemas.stats import (
    CircuitStatsDetailResponse,
    CircuitStatsListItem,
    HeadToHeadResponse,
    PlayerBadgesResponse,
    PlayerBestBadgeResponse,
    PlayerGameBadgeResponse,
)
from app.models import Circuit, Player
from app.services.tornei.stats import (
    get_badges_for_players,
    get_best_badges_for_players,
    get_circuit_stats_detail,
    get_circuit_stats_list,
    get_head_to_head_by_circuit,
    get_head_to_head_history,
    get_head_to_head_summary,
    get_player_badges,
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


@router.get("/players/{player_id}/badges", response_model=list[PlayerGameBadgeResponse])
def player_badges(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Giocatore non trovato")

    return get_player_badges(db, player_id)


@router.get("/players/badges/best", response_model=list[PlayerBestBadgeResponse])
def players_best_badges(db: Session = Depends(get_db)):
    """Badge migliore per ogni giocatore esistente — usato dal roster
    /players per evitare un fetch per-giocatore (N+1)."""
    player_ids = [row[0] for row in db.query(Player.id).all()]
    best_by_player = get_best_badges_for_players(db, player_ids)
    return [
        {"player_id": player_id, **best}
        for player_id, best in best_by_player.items()
    ]


@router.get("/players/badges/all", response_model=list[PlayerBadgesResponse])
def players_all_badges(db: Session = Depends(get_db)):
    """Elenco completo dei badge (uno per gioco) per ogni giocatore esistente
    — stessa ragion d'essere di /players/badges/best (evitare N+1 dal roster
    /players), ma senza collassare al solo tier migliore: mostra i badge
    ottenuti in tutti i giochi, non solo quello con tier più alto."""
    player_ids = [row[0] for row in db.query(Player.id).all()]
    badges_by_player = get_badges_for_players(db, player_ids)
    return [
        {"player_id": player_id, "badges": badges}
        for player_id, badges in badges_by_player.items()
    ]
