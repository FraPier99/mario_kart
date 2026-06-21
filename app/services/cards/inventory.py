from datetime import datetime

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
    item.consumed_at = datetime.utcnow()
    item.consumed_in_race_id = race_id
    item.consumed_effect = effect
    if phase:
        item.consumed_in_phase = phase
    if group_name:
        item.consumed_in_group_name = group_name
    db.flush()
    return item
