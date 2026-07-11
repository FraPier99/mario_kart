from datetime import datetime
from app.core.timezone import now_rome
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload


from app.core.db import get_db
from app.core.media import to_image_url
from app.core.security import get_current_user, require_roles
from app.services.cards.inventory import consume_inventory_item, get_inventory, get_tournament_awards
from app.models import Player, Race, Tournament, TournamentPlayer, User, UserInventory
from app.controllers.cards.schemas.inventory import UserInventoryResponse


def _get_participant_ids(db, tournament_id: int) -> list[int]:
    """Reliable participant lookup via TournamentPlayer join table."""
    links = (
        db.query(TournamentPlayer.player_id)
        .filter(TournamentPlayer.tournament_id == tournament_id)
        .all()
    )
    if links:
        return [row.player_id for row in links]
    # Fallback: infer from race results
    from app.models import Race, Result

    race_ids = [
        r.id
        for r in db.query(Race.id).filter(Race.tournament_id == tournament_id).all()
    ]
    if not race_ids:
        return []
    rows = (
        db.query(Result.player_id).filter(Result.race_id.in_(race_ids)).distinct().all()
    )
    return [r.player_id for r in rows]


router = APIRouter(prefix="/inventory", tags=["Inventory"])


def _check_game_compatibility(
    db: Session,
    item: UserInventory,
    race_id: int | None,
    tournament_id: int | None,
) -> None:
    """Raise 422 if the card was won in a different game than the current tournament."""
    if not item.source_tournament_id:
        return
    current_tid = None
    if race_id:
        from app.models import Race

        race = db.query(Race).filter(Race.id == race_id).first()
        if race:
            current_tid = race.tournament_id
    elif tournament_id:
        current_tid = tournament_id
    if current_tid is None:
        return
    current_t = db.query(Tournament).filter(Tournament.id == current_tid).first()
    source_t = (
        db.query(Tournament).filter(Tournament.id == item.source_tournament_id).first()
    )
    if not current_t or not source_t:
        return
    if source_t.game_id != current_t.game_id:
        game_name = (
            source_t.game.name if source_t.game else f"Gioco #{source_t.game_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Carta ottenuta in un torneo di '{game_name}'. Può essere usata solo in tornei dello stesso gioco.",
        )


PHASE_LABEL = {
    "group": "Gironi",
    "semifinal": "Semifinali",
    "finals": "Finale/Consolazione",
}


def _check_player_card_limit(
    db: Session, user_id: int, tournament_id: int | None, race_id: int | None
) -> None:
    """
    Massimo 1 Card TOTALE per giocatore per torneo (vale sia per gironi che classifica unica).
    Se l'utente ha già consumato una carta in questo torneo, blocca (422).
    """
    if not tournament_id:
        if race_id:
            race = db.query(Race).filter(Race.id == race_id).first()
            if race:
                tournament_id = race.tournament_id
    if not tournament_id:
        return
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        return

    already = (
        db.query(UserInventory)
        .join(Race, Race.id == UserInventory.consumed_in_race_id)
        .filter(
            UserInventory.user_id == user_id,
            UserInventory.is_consumed.is_(True),
            Race.tournament_id == tournament_id,
        )
        .count()
    )

    if already >= 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Hai già usato una Card in questo torneo. Limite: 1 Card totale per torneo.",
        )


def _check_not_duello_race(db: Session, race_id: int | None) -> None:
    """Le gare secche di spareggio (Duello/Tie-break) non ammettono l'uso di Card."""
    if race_id is None:
        return
    from app.models import Race

    race = db.query(Race).filter(Race.id == race_id).first()
    if race and race.is_duello:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le Card non possono essere usate nelle gare di spareggio.",
        )


class UseItemRequest(BaseModel):
    race_id: int | None = None
    effect: str | None = None
    tournament_id: int | None = None


@router.get("/tournament/{tournament_id}/holders")
def get_tournament_card_holders(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "superadmin")),
):
    """Returns per-participant card counts for the live panel."""
    if not db.query(Tournament).filter(Tournament.id == tournament_id).first():
        raise HTTPException(status_code=404, detail="Tournament not found")

    participant_ids = _get_participant_ids(db, tournament_id)
    if not participant_ids:
        return []

    players_obj = db.query(Player).filter(Player.id.in_(participant_ids)).all()
    result = []
    for player in players_obj:
        user_obj = db.query(User).filter(User.player_id == player.id).first()
        if not user_obj:
            continue
        cards = (
            db.query(UserInventory)
            .filter(
                UserInventory.user_id == user_obj.id, UserInventory.is_consumed == False
            )
            .all()
        )
        master_count = sum(1 for c in cards if c.card_type == "master")
        shell_count = sum(1 for c in cards if c.card_type == "blue_shell")
        if master_count > 0 or shell_count > 0:
            result.append(
                {
                    "player_id": player.id,
                    "player_nickname": player.nickname,
                    "player_img_url": to_image_url(f"/players/{player.id}/avatar", player.img_url),
                    "master_count": master_count,
                    "blue_shell_count": shell_count,
                }
            )
    return result


@router.get("/tournament/{tournament_id}/awards")
def get_tournament_awards_endpoint(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Chi ha vinto la Carta Master (schedina) e il Guscio Blu per questo
    torneo — pensato per la card pubblica "Ultimo torneo" della Home,
    quindi aperto a qualunque utente autenticato (non solo admin)."""
    if not db.query(Tournament).filter(Tournament.id == tournament_id).first():
        raise HTTPException(status_code=404, detail="Tournament not found")
    return get_tournament_awards(db, tournament_id)


@router.get("/tournament/{tournament_id}/history")
def get_tournament_card_history(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Storico ufficiale delle Card usate nel torneo: giocatore, fase, gara,
    effetto e data/ora di utilizzo (derivato da UserInventory + Race)."""
    if not db.query(Tournament).filter(Tournament.id == tournament_id).first():
        raise HTTPException(status_code=404, detail="Tournament not found")

    participant_ids = _get_participant_ids(db, tournament_id)
    if not participant_ids:
        return []

    users_by_id = {
        u.id: u.player_id
        for u in db.query(User).filter(User.player_id.in_(participant_ids)).all()
    }
    if not users_by_id:
        return []

    players_by_id = {
        p.id: p for p in db.query(Player).filter(Player.id.in_(participant_ids)).all()
    }

    items = (
        db.query(UserInventory)
        .join(Race, Race.id == UserInventory.consumed_in_race_id)
        .filter(
            UserInventory.is_consumed.is_(True),
            UserInventory.user_id.in_(users_by_id.keys()),
            Race.tournament_id == tournament_id,
        )
        .order_by(UserInventory.consumed_at.asc())
        .all()
    )

    result = []
    for item in items:
        race = db.query(Race).filter(Race.id == item.consumed_in_race_id).first()
        player = players_by_id.get(users_by_id.get(item.user_id))

        phase = race.phase if race else item.consumed_in_phase
        group_name = race.group_name if race else item.consumed_in_group_name

        result.append(
            {
                "player_id": player.id if player else None,
                "player_nickname": player.nickname if player else None,
                "card_type": item.card_type,
                "card_name": item.card_name,
                "effect": item.consumed_effect,
                "consumed_at": item.consumed_at,
                "race_id": race.id if race else None,
                "race_name": race.name if race else None,
                "race_order": race.race_order if race else None,
                "phase": phase,
                "group_name": group_name,
            }
        )
    return result


@router.get("/tournament/{tournament_id}/available")
def get_tournament_available_cards(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "superadmin")),
):
    if not db.query(Tournament).filter(Tournament.id == tournament_id).first():
        raise HTTPException(status_code=404, detail="Tournament not found")

    participant_ids = _get_participant_ids(db, tournament_id)
    if not participant_ids:
        return {"master": 0, "blue_shell": 0}

    user_ids = [
        u.id
        for u in db.query(User)
        .filter(User.player_id.in_(participant_ids), User.player_id.isnot(None))
        .all()
    ]
    if not user_ids:
        return {"master": 0, "blue_shell": 0}

    counts = (
        db.query(UserInventory.card_type, UserInventory.is_consumed)
        .filter(UserInventory.user_id.in_(user_ids))
        .all()
    )

    return {
        "master": sum(1 for c, consumed in counts if c == "master" and not consumed),
        "blue_shell": sum(
            1 for c, consumed in counts if c == "blue_shell" and not consumed
        ),
    }


class AdminGrantItemRequest(BaseModel):
    user_id: int
    card_type: str
    game_id: int
    note: str
    source_tournament_id: int | None = None


@router.post("/admin/grant", response_model=UserInventoryResponse)
def admin_grant_inventory_item(
    body: AdminGrantItemRequest,
    current_user=Depends(require_roles("admin", "superadmin")),
    db: Session = Depends(get_db),
):
    from app.services.cards.inventory import grant_card
    from app.services.utenti.notifications import create_single_notification

    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not body.note.strip():
        raise HTTPException(
            status_code=422,
            detail="Devi specificare una nota sul motivo dell'assegnazione",
        )

    item = grant_card(
        db,
        body.user_id,
        body.card_type,
        source_tournament_id=body.source_tournament_id,
    )
    if not item:
        raise HTTPException(status_code=400, detail="Failed to grant card")

    item.game_id = body.game_id
    item.granted_by_admin = True
    item.admin_note = body.note
    item.granted_by_user_id = current_user.id

    card_label = "Carta Master" if body.card_type == "master" else "Guscio Blu"
    admin_name = current_user.username or f"admin#{current_user.id}"
    create_single_notification(
        db,
        body.user_id,
        "card_granted",
        f"Un amministratore ti ha assegnato {card_label}.",
        source_user_id=current_user.id,
    )
    db.commit()
    db.refresh(item)
    return item


class AdminUseItemRequest(BaseModel):
    player_id: int
    card_type: str
    race_id: int | None = None
    effect: str | None = None
    tournament_id: int | None = None
    phase: str | None = None
    group_name: str | None = None


@router.post("/admin/use", response_model=UserInventoryResponse)
def admin_use_inventory_item(
    body: AdminUseItemRequest,
    current_user=Depends(require_roles("admin", "superadmin")),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.player_id == body.player_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nessun account utente collegato a questo giocatore",
        )
    item = (
        db.query(UserInventory)
        .filter(
            UserInventory.user_id == user.id,
            UserInventory.card_type == body.card_type,
            UserInventory.is_consumed == False,
        )
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Carta {body.card_type} non disponibile per questo giocatore",
        )
    _check_game_compatibility(db, item, body.race_id, body.tournament_id)
    _check_player_card_limit(db, user.id, body.tournament_id, body.race_id)
    _check_not_duello_race(db, body.race_id)
    item.is_consumed = True
    item.consumed_at = now_rome()
    if body.race_id is not None:
        item.consumed_in_race_id = body.race_id
        race = db.query(Race).filter(Race.id == body.race_id).first()
        if race:
            item.consumed_in_phase = race.phase
            item.consumed_in_group_name = race.group_name
    if body.phase is not None:
        item.consumed_in_phase = body.phase
    if body.group_name is not None:
        item.consumed_in_group_name = body.group_name
    if body.effect is not None:
        item.consumed_effect = body.effect
    db.commit()
    db.refresh(item)
    return item


@router.get("/public", response_model=list[UserInventoryResponse])
def get_public_inventory(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(UserInventory)
        .options(
            joinedload(UserInventory.user),
            joinedload(UserInventory.source_tournament),
            joinedload(UserInventory.game),
        )
        .order_by(UserInventory.created_at.desc())
        .all()
    )
    result = []
    for item in items:
        player = item.user.player if item.user else None
        result.append(
            {
                "id": item.id,
                "user_id": item.user_id,
                "card_type": item.card_type,
                "card_name": item.card_name,
                "description": item.description,
                "source_tournament_id": item.source_tournament_id,
                "source_tournament_name": item.source_tournament_name,
                "source_game_name": item.source_game_name,
                "source_schedina_id": item.source_schedina_id,
                "is_consumed": item.is_consumed,
                "consumed_in_race_id": item.consumed_in_race_id,
                "consumed_in_phase": item.consumed_in_phase,
                "consumed_in_group_name": item.consumed_in_group_name,
                "consumed_effect": item.consumed_effect,
                "created_at": item.created_at,
                "consumed_at": item.consumed_at,
                "game_id": item.game_id,
                "granted_by_admin": item.granted_by_admin,
                "user_nickname": player.nickname if player else None,
                # Stesso fix di PlayerResponse/AuthPlayerSummary (app.core.media):
                # senza, ogni riga di inventario incorpora l'avatar in base64
                # crudo del titolare della carta.
                "user_img_url": to_image_url(f"/players/{player.id}/avatar", player.img_url) if player else None,
            }
        )
    return result


@router.get("/all", response_model=list[UserInventoryResponse])
def get_all_inventory(
    current_user=Depends(require_roles("superadmin")),
    db: Session = Depends(get_db),
):
    items = (
        db.query(UserInventory)
        .options(
            joinedload(UserInventory.user),
            joinedload(UserInventory.source_tournament),
            joinedload(UserInventory.game),
            joinedload(UserInventory.granted_by_user),
        )
        .order_by(UserInventory.created_at.desc())
        .all()
    )
    result = []
    for item in items:
        player = item.user.player if item.user else None
        result.append(
            {
                "id": item.id,
                "user_id": item.user_id,
                "card_type": item.card_type,
                "card_name": item.card_name,
                "description": item.description,
                "source_tournament_id": item.source_tournament_id,
                "source_tournament_name": item.source_tournament_name,
                "source_game_name": item.source_game_name,
                "source_schedina_id": item.source_schedina_id,
                "is_consumed": item.is_consumed,
                "consumed_in_race_id": item.consumed_in_race_id,
                "consumed_in_phase": item.consumed_in_phase,
                "consumed_in_group_name": item.consumed_in_group_name,
                "consumed_effect": item.consumed_effect,
                "created_at": item.created_at,
                "consumed_at": item.consumed_at,
                "game_id": item.game_id,
                "granted_by_admin": item.granted_by_admin,
                "admin_note": item.admin_note,
                "granted_by_user_id": item.granted_by_user_id,
                "granted_by_username": item.granted_by_user.username
                if item.granted_by_user
                else None,
                "user_nickname": player.nickname if player else None,
                # Stesso fix di PlayerResponse/AuthPlayerSummary (app.core.media):
                # senza, ogni riga di inventario incorpora l'avatar in base64
                # crudo del titolare della carta.
                "user_img_url": to_image_url(f"/players/{player.id}/avatar", player.img_url) if player else None,
            }
        )
    return result


@router.get("/me", response_model=list[UserInventoryResponse])
def read_my_inventory(
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    return get_inventory(db, current_user.id)


@router.post("/{item_id}/use", response_model=UserInventoryResponse)
def use_inventory_item(
    item_id: int,
    body: UseItemRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(UserInventory)
        .filter(UserInventory.id == item_id, UserInventory.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Carta non trovata"
        )
    _check_game_compatibility(db, item, body.race_id, body.tournament_id)
    _check_player_card_limit(db, current_user.id, body.tournament_id, body.race_id)
    _check_not_duello_race(db, body.race_id)
    item = consume_inventory_item(
        db, item_id, current_user.id, race_id=body.race_id, effect=body.effect
    )
    db.commit()
    return item
