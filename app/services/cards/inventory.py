from datetime import datetime
from app.core.timezone import now_rome

from sqlalchemy.orm import Session, joinedload

from app.models import CardUsageLog, Race, UserInventory


CARD_META = {
    "master": {
        "card_name": "Carta Master",
        "description": "Puoi usarla dal vivo nel torneo successivo per annullare la pista scelta da un avversario e imporre la tua, imporre un personaggio a un avversario per una gara, oppure aggiungere una gara a fine torneo.",
        "max_uses": 1,
    },
    "blue_shell": {
        "card_name": "Carta Guscio Blu",
        "description": "Puoi usarla nel torneo successivo per fermare tutti gli altri per un giro: parti con un giro di vantaggio. Attivabile fino a 3 volte nello stesso torneo.",
        "max_uses": 3,
    },
}


def grant_card(
    db: Session,
    user_id: int,
    card_type: str,
    *,
    source_tournament_id: int | None = None,
    source_schedina_id: int | None = None,
    force_new: bool = False,
):
    """force_new=True salta la deduplicazione e crea sempre una riga nuova
    — usato dalle assegnazioni manuali dell'admin, dove
    source_tournament_id è sempre None e senza questa opzione la seconda
    assegnazione dello stesso card_type allo stesso utente restituirebbe
    silenziosamente la carta già esistente invece di crearne una nuova. Il
    percorso automatico (liquidazione schedine) non passa questo parametro:
    resta idempotente com'era, per non rischiare doppie assegnazioni se la
    liquidazione venisse eseguita due volte sullo stesso torneo."""
    meta = CARD_META[card_type]
    if not force_new:
        existing = (
            db.query(UserInventory)
            .filter(
                UserInventory.user_id == user_id,
                UserInventory.card_type == card_type,
                UserInventory.source_tournament_id == source_tournament_id,
            )
            .first()
        )
        if existing:
            return existing

    max_uses = meta["max_uses"]
    item = UserInventory(
        user_id=user_id,
        card_type=card_type,
        card_name=meta["card_name"],
        description=meta["description"],
        source_tournament_id=source_tournament_id,
        source_schedina_id=source_schedina_id,
        max_uses=max_uses,
        uses_remaining=max_uses,
    )
    db.add(item)
    db.flush()
    return item


def revoke_card(db: Session, item_id: int):
    """Rimuove una carta assegnata per errore, controparte di grant_card.
    Consentito solo per carte non ancora consumate: una carta già usata è un
    evento di gioco già avvenuto, revocarla retroattivamente creerebbe
    incongruenze con la cronologia."""
    item = db.query(UserInventory).filter(UserInventory.id == item_id).first()
    if not item:
        raise ValueError(f"Carta con id {item_id} non trovata")
    if item.is_consumed:
        raise ValueError("Non è possibile revocare una carta già utilizzata")

    user_id = item.user_id
    card_type = item.card_type
    db.delete(item)
    db.flush()
    return user_id, card_type


def get_tournament_awards(db: Session, tournament_id: int) -> dict:
    """Chi ha vinto la Carta Master (schedina) e il Guscio Blu per un torneo,
    a prescindere dal fatto che la carta sia già stata consumata o meno —
    a differenza degli endpoint /holders (solo carte non consumate, non
    filtrate per torneo sorgente) e /history (solo carte già usate in gara),
    nessuno dei due adatto a rispondere "chi ha vinto la card X da questo
    torneo"."""
    from app.models import Player, User

    items = (
        db.query(UserInventory)
        .filter(
            UserInventory.source_tournament_id == tournament_id,
            UserInventory.card_type.in_(["master", "blue_shell"]),
        )
        .order_by(UserInventory.id.asc())
        .all()
    )
    if not items:
        return {"master_winners": [], "blue_shell_winners": []}

    user_ids = {item.user_id for item in items}
    players_by_user_id = {
        u.id: u.player
        for u in db.query(User).filter(User.id.in_(user_ids)).all()
        if u.player
    }

    result = {"master_winners": [], "blue_shell_winners": []}
    seen = set()
    for item in items:
        player = players_by_user_id.get(item.user_id)
        if not player or (item.card_type, player.id) in seen:
            continue
        seen.add((item.card_type, player.id))
        key = "master_winners" if item.card_type == "master" else "blue_shell_winners"
        result[key].append(
            {
                "player_id": player.id,
                "nickname": player.nickname,
                "img_url": player.img_url,
            }
        )
    return result


def get_inventory(db: Session, user_id: int | None = None):
    query = db.query(UserInventory).options(joinedload(UserInventory.source_tournament))
    if user_id is not None:
        query = query.filter(UserInventory.user_id == user_id)
    return query.order_by(
        UserInventory.is_consumed.asc(),
        UserInventory.created_at.desc(),
        UserInventory.id.desc(),
    ).all()


def record_card_usage(
    db: Session,
    item: UserInventory,
    *,
    tournament_id: int | None,
    race_id: int | None = None,
    target_player_id: int | None = None,
    imposed_circuit_id: int | None = None,
    imposed_character_id: int | None = None,
    effect: str | None = None,
    used_by_user_id: int | None = None,
):
    """Registra UN uso della carta: crea la riga di log (CardUsageLog) e
    decrementa uses_remaining sull'item — è QUESTO il momento in cui la
    carta si considera "spesa", anche se l'effetto riguarda una gara non
    ancora creata (race_id=None, "in sospeso": vedi resolve_pending_card_usage).
    Decrementare qui e non alla risoluzione evita che la stessa carta possa
    essere dichiarata due volte in sospeso prima di essere risolta.

    Aggiorna anche le colonne piatte di UserInventory con quest'ultimo uso,
    per compatibilità con gli endpoint /all e /public che le leggono
    direttamente (mostrano sempre "l'ultimo uso", non l'intero storico)."""
    log = CardUsageLog(
        inventory_item_id=item.id,
        tournament_id=tournament_id,
        race_id=race_id,
        target_player_id=target_player_id,
        imposed_circuit_id=imposed_circuit_id,
        imposed_character_id=imposed_character_id,
        effect=effect or "",
        used_by_user_id=used_by_user_id,
    )
    db.add(log)
    db.flush()

    item.uses_remaining = max(0, item.uses_remaining - 1)
    item.is_consumed = item.uses_remaining <= 0
    item.consumed_at = now_rome()
    item.consumed_in_race_id = race_id
    item.consumed_effect = effect
    item.target_player_id = target_player_id
    if race_id:
        race = db.query(Race).filter(Race.id == race_id).first()
        if race:
            item.consumed_in_phase = race.phase
            item.consumed_in_group_name = race.group_name
    db.flush()
    return item, log


def resolve_pending_card_usage(db: Session, log_id: int, race_id: int):
    """Collega a una gara appena creata un uso Master "in sospeso"
    (ban_pista/imponi_personaggio, dichiarati con race_id=None perché la
    gara non esisteva ancora — vedi ClassicRaceForm). Idempotente: se il log
    ha già una gara collegata non fa nulla."""
    log = db.query(CardUsageLog).filter(CardUsageLog.id == log_id).first()
    if not log:
        return None
    if log.race_id is not None:
        return log

    log.race_id = race_id
    item = (
        db.query(UserInventory)
        .filter(UserInventory.id == log.inventory_item_id)
        .first()
    )
    if item:
        item.consumed_in_race_id = race_id
        race = db.query(Race).filter(Race.id == race_id).first()
        if race:
            item.consumed_in_phase = race.phase
            item.consumed_in_group_name = race.group_name
    db.flush()
    return log


def get_pending_card_usages(db: Session, tournament_id: int):
    """Effetti Master (ban_pista/imponi_personaggio) dichiarati ma non
    ancora collegati a una gara — usati da ClassicRaceForm per proporli in
    automatico quando si crea la prossima gara di quel torneo."""
    return (
        db.query(CardUsageLog)
        .filter(
            CardUsageLog.tournament_id == tournament_id,
            CardUsageLog.race_id.is_(None),
        )
        .order_by(CardUsageLog.used_at.asc())
        .all()
    )


def consume_inventory_item(
    db: Session,
    item_id: int,
    user_id: int,
    *,
    tournament_id: int | None = None,
    race_id: int | None = None,
    effect: str | None = None,
    target_player_id: int | None = None,
    imposed_circuit_id: int | None = None,
    imposed_character_id: int | None = None,
):
    """Percorso self-service (il giocatore segna da sé la propria carta come
    usata, senza i campi strutturati che raccoglie invece il modale admin —
    vedi record_card_usage per la logica di consumo condivisa)."""
    item = (
        db.query(UserInventory)
        .filter(UserInventory.id == item_id, UserInventory.user_id == user_id)
        .first()
    )
    if not item:
        return None
    if item.uses_remaining <= 0:
        return item

    resolved_tournament_id = tournament_id
    if resolved_tournament_id is None and race_id:
        race = db.query(Race).filter(Race.id == race_id).first()
        resolved_tournament_id = race.tournament_id if race else None
    if resolved_tournament_id is None:
        resolved_tournament_id = item.source_tournament_id

    item, _log = record_card_usage(
        db,
        item,
        tournament_id=resolved_tournament_id,
        race_id=race_id,
        target_player_id=target_player_id,
        imposed_circuit_id=imposed_circuit_id,
        imposed_character_id=imposed_character_id,
        effect=effect,
        used_by_user_id=user_id,
    )
    return item
