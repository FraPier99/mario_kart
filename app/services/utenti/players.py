import re

from sqlalchemy.orm import Session
from app.models import Player
from app.controllers.utenti.schemas.players import CreatePlayer, UpdatePlayer


RESERVED_NICKNAMES = {"tutti"}  # @tutti è il tag speciale "menziona tutti" — vedi services/utenti/notifications.py


def sanitize_nickname(value: str) -> str:
    """Nickname: solo lettere e numeri, sempre minuscolo (niente spazi o caratteri speciali)."""
    cleaned = (value or "").strip().lower()
    return re.sub(r"[^a-z0-9]", "", cleaned)


def get_players(db: Session):
    return db.query(Player).all()


def create_player(db: Session, players_data: CreatePlayer):
    payload = players_data.model_dump()
    if payload.get("nickname"):
        sanitized = sanitize_nickname(payload["nickname"])
        if not sanitized:
            raise ValueError("Il nickname deve contenere almeno un carattere alfanumerico")
        if sanitized in RESERVED_NICKNAMES:
            raise ValueError(f"Il nickname '{sanitized}' è riservato")
        existing = db.query(Player).filter(Player.nickname == sanitized).first()
        if existing:
            raise ValueError(f"Il nickname '{sanitized}' è già in uso")
        payload["nickname"] = sanitized

    new_player = Player(**payload)
    db.add(new_player)
    db.commit()
    db.refresh(new_player)

    return new_player


def delete_player(db: Session, player_id: int):
    player = db.query(Player).filter(Player.id == player_id).first()

    if not player:
        return None

    db.delete(player)
    db.commit()

    return player


def get_player(db: Session, player_id: int):
    player = db.query(Player).filter(Player.id == player_id).first()

    if not player:
        return None

    return player


def get_all_players(db: Session):
    return db.query(Player).all()


def update_player(db: Session, player_data: UpdatePlayer, player_id: int):
    player = db.query(Player).filter(Player.id == player_id).first()

    if not player:
        return None

    update_data = player_data.model_dump(exclude_unset=True)

    nickname_changed = False
    if "nickname" in update_data and update_data["nickname"]:
        sanitized = sanitize_nickname(update_data["nickname"])
        if not sanitized:
            raise ValueError("Il nickname deve contenere almeno un carattere alfanumerico")
        if sanitized in RESERVED_NICKNAMES:
            raise ValueError(f"Il nickname '{sanitized}' è riservato")
        existing = (
            db.query(Player)
            .filter(Player.nickname == sanitized, Player.id != player_id)
            .first()
        )
        if existing:
            raise ValueError(f"Il nickname '{sanitized}' è già in uso")
        update_data["nickname"] = sanitized
        nickname_changed = sanitized != player.nickname

    for key, value in update_data.items():
        setattr(player, key, value)

    db.commit()
    db.refresh(player)

    # Mantiene sincronizzato lo username (usato per il login) con il nuovo
    # nickname: altrimenti lo username resta agganciato al valore generato
    # alla creazione dell'account, scollegato dal nickname mostrato nell'app,
    # e il giocatore non può accedere con il nickname appena impostato.
    if nickname_changed:
        from app.services.utenti.users import (
            _ensure_unique_username,
            _normalize_username,
            get_user_by_player_id,
        )

        user = get_user_by_player_id(db, player_id)
        if user:
            new_username = _ensure_unique_username(
                db, _normalize_username(player.nickname), current_user_id=user.id
            )
            if new_username != user.username:
                user.username = new_username
                db.commit()

    return player
