from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload


from app.core.db import get_db
from app.core.media import to_image_url
from app.core.security import get_current_user, require_roles
from app.services.cards.inventory import (
    consume_inventory_item,
    get_inventory,
    get_pending_card_usages,
    get_tournament_awards,
    record_card_usage,
    resolve_pending_card_usage,
)
from app.models import CardUsageLog, Player, Race, Tournament, TournamentPlayer, User, UserInventory
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


def _resolve_tournament_id(db: Session, tournament_id: int | None, race_id: int | None) -> int | None:
    if tournament_id:
        return tournament_id
    if race_id:
        race = db.query(Race).filter(Race.id == race_id).first()
        if race:
            return race.tournament_id
    return None


def _check_card_available(item: UserInventory) -> None:
    """La carta ha ancora usi disponibili (1 per Master, fino a max_uses per
    Guscio Blu — vedi CARD_META). Sostituisce il vecchio limite incrociato
    "1 card totale per torneo indipendentemente dal tipo", decaduto insieme
    all'introduzione degli usi multipli: il limite ora è per-carta
    (uses_remaining), non più un tetto unico che mischiava Master e Guscio
    Blu. Corregge anche un bug del vecchio controllo, che contava solo gli
    usi già legati a una gara (JOIN su Race) — un uso senza gara non veniva
    mai conteggiato."""
    if item.uses_remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Questa carta è esaurita: nessun uso rimasto.",
        )


def _check_activation_tournament(
    db: Session, item: UserInventory, tournament_id: int | None
) -> None:
    """Il Guscio Blu, una volta attivato (primo uso) in un torneo, deve
    esaurire lì i suoi usi restanti — non si possono "risparmiare" per un
    torneo successivo. Se questo non è il primo uso, il torneo dev'essere
    lo stesso del primo uso registrato."""
    if item.uses_remaining >= item.max_uses:
        return  # primo uso, nessun vincolo pregresso
    first_use = (
        db.query(CardUsageLog)
        .filter(CardUsageLog.inventory_item_id == item.id)
        .order_by(CardUsageLog.used_at.asc())
        .first()
    )
    if first_use and first_use.tournament_id and first_use.tournament_id != tournament_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Questa carta è già stata attivata in un altro torneo: gli usi restanti valgono solo lì.",
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


def _check_not_friendly_tournament(db: Session, tournament_id: int | None) -> None:
    """Nei tornei amichevoli non c'è alcun meta-game in palio: le Card non
    sono utilizzabili."""
    if tournament_id is None:
        return
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if tournament and tournament.is_friendly:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le Card non sono disponibili nei tornei amichevoli.",
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
    effetto e data/ora di utilizzo — un rigo per OGNI uso (CardUsageLog), non
    più uno per carta: un Guscio Blu attivato 3 volte compare come 3 righe
    distinte, non una sola come con le sole colonne piatte di UserInventory."""
    if not db.query(Tournament).filter(Tournament.id == tournament_id).first():
        raise HTTPException(status_code=404, detail="Tournament not found")

    participant_ids = _get_participant_ids(db, tournament_id)
    if not participant_ids:
        return []

    players_by_id = {
        p.id: p for p in db.query(Player).filter(Player.id.in_(participant_ids)).all()
    }

    logs = (
        db.query(CardUsageLog)
        .join(UserInventory, UserInventory.id == CardUsageLog.inventory_item_id)
        .filter(CardUsageLog.tournament_id == tournament_id)
        .order_by(CardUsageLog.used_at.asc())
        .all()
    )

    result = []
    for log in logs:
        item = log.inventory_item
        owner_player = item.user.player if item and item.user else None
        if not owner_player or owner_player.id not in players_by_id:
            continue
        race = log.race
        target_player = log.target_player

        result.append(
            {
                "player_id": owner_player.id,
                "player_nickname": owner_player.nickname,
                "card_type": item.card_type,
                "card_name": item.card_name,
                "effect": log.effect,
                "consumed_at": log.used_at,
                "race_id": race.id if race else None,
                "race_name": race.name if race else None,
                "race_order": race.race_order if race else None,
                "phase": race.phase if race else None,
                "group_name": race.group_name if race else None,
                "pending": race is None,
                "target_player_id": target_player.id if target_player else None,
                "target_nickname": target_player.nickname if target_player else None,
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
        force_new=True,
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


class AdminRevokeItemRequest(BaseModel):
    note: str | None = None


@router.post("/admin/revoke/{item_id}")
def admin_revoke_inventory_item(
    item_id: int,
    body: AdminRevokeItemRequest | None = None,
    current_user=Depends(require_roles("admin", "superadmin")),
    db: Session = Depends(get_db),
):
    from app.services.cards.inventory import revoke_card
    from app.services.utenti.notifications import create_single_notification

    try:
        user_id, card_type = revoke_card(db, item_id)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(error))

    card_label = "Carta Master" if card_type == "master" else "Guscio Blu"
    create_single_notification(
        db,
        user_id,
        "card_revoked",
        f"Un amministratore ti ha revocato {card_label}.",
        source_user_id=current_user.id,
    )
    db.commit()
    return {"message": "Carta revocata con successo"}


class AdminUseItemRequest(BaseModel):
    player_id: int
    card_type: str
    tournament_id: int
    race_id: int | None = None
    effect: str | None = None
    phase: str | None = None
    group_name: str | None = None
    # Bersaglio avversario (ban_pista/imponi_personaggio) e la pista/il
    # personaggio imposti — vedi CardUsageLog. race_id resta None per questi
    # due effetti finché la gara che devono influenzare non esiste ancora:
    # si risolve dopo con POST /card-usage/{log_id}/resolve.
    target_player_id: int | None = None
    imposed_circuit_id: int | None = None
    imposed_character_id: int | None = None


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
            UserInventory.uses_remaining > 0,
        )
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Carta {body.card_type} non disponibile per questo giocatore",
        )
    _check_game_compatibility(db, item, body.race_id, body.tournament_id)
    _check_card_available(item)
    _check_activation_tournament(db, item, body.tournament_id)
    _check_not_duello_race(db, body.race_id)
    _check_not_friendly_tournament(db, _resolve_tournament_id(db, body.tournament_id, body.race_id))

    item, log = record_card_usage(
        db,
        item,
        tournament_id=body.tournament_id,
        race_id=body.race_id,
        target_player_id=body.target_player_id,
        imposed_circuit_id=body.imposed_circuit_id,
        imposed_character_id=body.imposed_character_id,
        effect=body.effect,
        used_by_user_id=current_user.id,
    )
    if body.phase is not None:
        item.consumed_in_phase = body.phase
    if body.group_name is not None:
        item.consumed_in_group_name = body.group_name

    db.commit()
    db.refresh(item)
    return item


class ResolveCardUsageRequest(BaseModel):
    race_id: int


@router.post("/card-usage/{log_id}/resolve", response_model=UserInventoryResponse)
def resolve_card_usage_endpoint(
    log_id: int,
    body: ResolveCardUsageRequest,
    current_user=Depends(require_roles("admin", "superadmin")),
    db: Session = Depends(get_db),
):
    """Collega a una gara appena creata un effetto Master dichiarato "in
    sospeso" (ban_pista/imponi_personaggio) — vedi ClassicRaceForm."""
    log = resolve_pending_card_usage(db, log_id, body.race_id)
    if not log:
        raise HTTPException(status_code=404, detail="Utilizzo carta non trovato")
    item = db.query(UserInventory).filter(UserInventory.id == log.inventory_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Carta non trovata")
    db.commit()
    db.refresh(item)
    return item


@router.get("/tournament/{tournament_id}/pending-effects")
def get_pending_effects(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "superadmin")),
):
    """Effetti Master dichiarati ma non ancora collegati a una gara (vedi
    ClassicRaceForm, che li propone in automatico alla prossima gara che
    coinvolge il bersaglio)."""
    logs = get_pending_card_usages(db, tournament_id)
    result = []
    for log in logs:
        item = db.query(UserInventory).filter(UserInventory.id == log.inventory_item_id).first()
        owner_player = item.user.player if item and item.user else None
        result.append(
            {
                "id": log.id,
                "inventory_item_id": log.inventory_item_id,
                "owner_player_id": owner_player.id if owner_player else None,
                "owner_nickname": owner_player.nickname if owner_player else None,
                "target_player_id": log.target_player_id,
                "target_nickname": log.target_player.nickname if log.target_player else None,
                "effect": log.effect,
                "imposed_circuit_id": log.imposed_circuit_id,
                "imposed_character_id": log.imposed_character_id,
                "used_at": log.used_at,
            }
        )
    return result


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
    current_user=Depends(require_roles("admin", "superadmin")),
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
    resolved_tournament_id = _resolve_tournament_id(db, body.tournament_id, body.race_id)
    _check_game_compatibility(db, item, body.race_id, body.tournament_id)
    _check_card_available(item)
    _check_activation_tournament(db, item, resolved_tournament_id)
    _check_not_duello_race(db, body.race_id)
    _check_not_friendly_tournament(db, resolved_tournament_id)
    item = consume_inventory_item(
        db, item_id, current_user.id,
        tournament_id=resolved_tournament_id, race_id=body.race_id, effect=body.effect,
    )
    db.commit()
    return item
