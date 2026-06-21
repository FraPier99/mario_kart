from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password, normalize_role, verify_password
from app.models import User
from app.services.utenti.players import get_player
from app.controllers.utenti.schemas.auth import CreateUser, UpdateUser


def _normalize_username(value: str) -> str:
    cleaned = value.strip().lower()
    cleaned = cleaned.replace("'", "")
    cleaned = "".join(
        character if character.isalnum() else "_" for character in cleaned
    )
    while "__" in cleaned:
        cleaned = cleaned.replace("__", "_")
    return cleaned.strip("_")


def _build_username_from_player(player) -> str:
    base = player.nickname or f"{player.first_name}.{player.last_name}"
    return _normalize_username(base)


def _ensure_unique_username(
    db: Session, base_username: str, current_user_id: int | None = None
):
    candidate = base_username
    suffix = 1

    while True:
        existing = get_user_by_username(db, candidate)
        if not existing or existing.id == current_user_id:
            return candidate
        candidate = f"{base_username}{suffix}"
        suffix += 1


def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username.strip().lower()).first()


def get_user_by_login_identifier(db: Session, identifier: str):
    """
    Risolve l'identificativo inserito al login: prova prima come
    username/nickname diretto, poi come "nome_cognome" (first_name +
    last_name del Player collegato, sanitizzato come uno username) — così il
    login funziona sia con il nickname che con nome e cognome.
    """
    normalized = _normalize_username(identifier or "")
    if not normalized:
        return None

    user = get_user_by_username(db, normalized)
    if user:
        return user

    from app.models import Player

    rows = (
        db.query(User, Player)
        .join(Player, User.player_id == Player.id)
        .all()
    )
    for candidate_user, player in rows:
        full_name = _normalize_username(f"{player.first_name}_{player.last_name}")
        if full_name == normalized:
            return candidate_user

    return None


def get_user_by_player_id(db: Session, player_id: int):
    return db.query(User).filter(User.player_id == player_id).first()


def list_users(db: Session):
    return db.query(User).all()


def create_user(db: Session, user_data: CreateUser):
    role = normalize_role(user_data.role)
    player = None

    if role == "superadmin":
        if not user_data.username:
            raise ValueError("Username is required for superadmin accounts")
    else:
        if not user_data.player_id:
            raise ValueError("A linked player is required for user and admin accounts")

        player = get_player(db, user_data.player_id)
        if not player:
            raise ValueError("Linked player not found")

        existing_link = get_user_by_player_id(db, user_data.player_id)
        if existing_link:
            raise ValueError("That player already has an account")

    base_username = user_data.username.strip() if user_data.username else ""
    if not base_username and player is not None:
        base_username = _build_username_from_player(player)

    if not base_username:
        raise ValueError("Username is required")

    username = _ensure_unique_username(db, _normalize_username(base_username))

    new_user = User(
        username=username,
        password_hash=hash_password(user_data.password),
        role=role,
        player_id=None if role == "superadmin" else user_data.player_id,
        is_active=user_data.is_active,
        must_change_password=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def update_user(db: Session, user_id: int, user_data: UpdateUser):
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    update_data = user_data.model_dump(exclude_unset=True)
    password = update_data.pop("password", None)

    if "username" in update_data and update_data["username"]:
        update_data["username"] = update_data["username"].strip().lower()

    if update_data.get("role") == "superadmin":
        update_data["player_id"] = None

    if (
        update_data.get("role") in {"admin", "user"}
        and update_data.get("player_id") is None
        and user.player_id is None
    ):
        raise ValueError("A linked player is required for user and admin accounts")

    if "role" in update_data and update_data["role"]:
        update_data["role"] = normalize_role(update_data["role"])

    if "player_id" in update_data and update_data["player_id"]:
        linked_player = get_player(db, update_data["player_id"])
        if not linked_player:
            raise ValueError("Linked player not found")
        existing_link = get_user_by_player_id(db, update_data["player_id"])
        if existing_link and existing_link.id != user.id:
            raise ValueError("That player already has an account")

    for key, value in update_data.items():
        setattr(user, key, value)

    if password:
        user.password_hash = hash_password(password)
        user.must_change_password = True

    db.commit()
    db.refresh(user)
    return user


def change_user_password(
    db: Session, user_id: int, new_password: str, current_password: str | None = None
):
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    if current_password is not None and not verify_password(
        current_password, user.password_hash
    ):
        raise ValueError("Password corrente non valida")

    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    db.commit()
    db.refresh(user)
    return user


def validate_user_password(user: User, password: str) -> bool:
    return verify_password(password, user.password_hash)


def delete_user(db: Session, user_id: int):
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    try:
        user.player_id = None

        from sqlalchemy import text

        db.execute(
            text(
                "UPDATE photo_comments SET edited_by_user_id = NULL WHERE edited_by_user_id = :uid"
            ),
            {"uid": user_id},
        )
        db.execute(
            text(
                "UPDATE notifications SET source_user_id = NULL WHERE source_user_id = :uid"
            ),
            {"uid": user_id},
        )
        db.execute(
            text(
                "UPDATE tournaments SET vincitore_schedina_id = NULL WHERE vincitore_schedina_id = :uid"
            ),
            {"uid": user_id},
        )
        db.execute(
            text(
                "UPDATE audit_log SET actor_user_id = NULL WHERE actor_user_id = :uid"
            ),
            {"uid": user_id},
        )

        db.execute(
            text(
                "UPDATE notifications SET source_photo_id = NULL WHERE source_photo_id IN (SELECT id FROM tournament_photos WHERE uploaded_by_user_id = :uid)"
            ),
            {"uid": user_id},
        )
        db.execute(
            text("DELETE FROM photo_comments WHERE user_id = :uid"),
            {"uid": user_id},
        )
        db.execute(
            text(
                "DELETE FROM photo_comments WHERE photo_id IN (SELECT id FROM tournament_photos WHERE uploaded_by_user_id = :uid)"
            ),
            {"uid": user_id},
        )
        db.execute(
            text("DELETE FROM tournament_photos WHERE uploaded_by_user_id = :uid"),
            {"uid": user_id},
        )
        db.execute(
            text("DELETE FROM notifications WHERE user_id = :uid"),
            {"uid": user_id},
        )
        db.execute(
            text("DELETE FROM temp_passwords WHERE user_id = :uid"),
            {"uid": user_id},
        )

        db.flush()
        db.delete(user)
        db.commit()
        return user
    except IntegrityError as e:
        db.rollback()
        raise ValueError(f"Impossibile eliminare l'utente: {e}")
