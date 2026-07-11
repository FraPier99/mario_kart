from datetime import datetime
from app.core.timezone import now_rome

from sqlalchemy.orm import Session, joinedload

from app.models import UserInventory


CARD_META = {
    "master": {
        "card_name": "Carta Master",
        "description": "Puoi usarla dal vivo nel torneo successivo per bannare una pista o imporre un PG specifico.",
    },
    "blue_shell": {
        "card_name": "Carta Guscio Blu",
        "description": "Puoi usarla nel torneo successivo per fissare una pista a tuo vantaggio: nessuno può bannarla.",
    },
}


def grant_card(
    db: Session,
    user_id: int,
    card_type: str,
    *,
    source_tournament_id: int | None = None,
    source_schedina_id: int | None = None,
):
    meta = CARD_META[card_type]
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

    item = UserInventory(
        user_id=user_id,
        card_type=card_type,
        card_name=meta["card_name"],
        description=meta["description"],
        source_tournament_id=source_tournament_id,
        source_schedina_id=source_schedina_id,
    )
    db.add(item)
    db.flush()
    return item


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


def consume_inventory_item(
    db: Session,
    item_id: int,
    user_id: int,
    *,
    race_id: int | None = None,
    effect: str | None = None,
    phase: str | None = None,
    group_name: str | None = None,
):
    item = (
        db.query(UserInventory)
        .filter(UserInventory.id == item_id, UserInventory.user_id == user_id)
        .first()
    )
    if not item:
        return None
    if item.is_consumed:
        return item

    item.is_consumed = True
    item.consumed_at = now_rome()
    item.consumed_in_race_id = race_id
    item.consumed_effect = effect
    if phase:
        item.consumed_in_phase = phase
    if group_name:
        item.consumed_in_group_name = group_name
    db.flush()
    return item
