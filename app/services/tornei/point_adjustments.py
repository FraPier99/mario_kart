from sqlalchemy.orm import Session

from app.models import PointAdjustment, Tournament, TournamentPlayer


def _serialize(adjustment: PointAdjustment) -> dict:
    return {
        "id": adjustment.id,
        "tournament_id": adjustment.tournament_id,
        "player_id": adjustment.player_id,
        "player_nickname": adjustment.player.nickname if adjustment.player else "—",
        "points": adjustment.points,
        "reason": adjustment.reason,
        "created_by_user_id": adjustment.created_by_user_id,
        "created_by_username": adjustment.created_by.username if adjustment.created_by else "—",
        "created_at": adjustment.created_at,
    }


def get_point_adjustments(db: Session) -> list[dict]:
    """Tutte le rettifiche, più recenti prima — caricamento in blocco lato
    frontend, stesso pattern di racesApi.list()/resultsApi.list()."""
    rows = (
        db.query(PointAdjustment)
        .order_by(PointAdjustment.created_at.desc())
        .all()
    )
    return [_serialize(row) for row in rows]


def get_point_adjustment_totals(db: Session, tournament_id: int) -> dict[int, int]:
    """Somma delle rettifiche per giocatore in un torneo — usata da
    _classic_classifica e get_leaderboard per allineare la classifica
    ufficiale a quanto mostrato pubblicamente."""
    rows = (
        db.query(PointAdjustment)
        .filter(PointAdjustment.tournament_id == tournament_id)
        .all()
    )
    totals: dict[int, int] = {}
    for row in rows:
        totals[row.player_id] = totals.get(row.player_id, 0) + row.points
    return totals


def create_point_adjustment(
    db: Session,
    tournament_id: int,
    player_id: int,
    points: int,
    reason: str,
    actor_user_id: int,
) -> PointAdjustment:
    if points == 0:
        raise ValueError("I punti della rettifica non possono essere zero")
    if not reason or not reason.strip():
        raise ValueError("Il motivo della rettifica è obbligatorio")

    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise ValueError("Torneo non trovato")
    if tournament.tournament_format == "group_stage":
        raise ValueError(
            "Le rettifiche punti sono disponibili solo per i tornei classic: "
            "nei tornei a gironi non esiste un totale punti unico per l'intero torneo"
        )

    is_participant = (
        db.query(TournamentPlayer)
        .filter(
            TournamentPlayer.tournament_id == tournament_id,
            TournamentPlayer.player_id == player_id,
        )
        .first()
        is not None
    )
    if not is_participant:
        raise ValueError("Il giocatore non è un partecipante di questo torneo")

    adjustment = PointAdjustment(
        tournament_id=tournament_id,
        player_id=player_id,
        points=points,
        reason=reason.strip(),
        created_by_user_id=actor_user_id,
    )
    db.add(adjustment)
    db.commit()
    db.refresh(adjustment)
    return _serialize(adjustment)


def delete_point_adjustment(db: Session, adjustment_id: int):
    adjustment = (
        db.query(PointAdjustment).filter(PointAdjustment.id == adjustment_id).first()
    )
    if not adjustment:
        return None
    db.delete(adjustment)
    db.commit()
    return adjustment
