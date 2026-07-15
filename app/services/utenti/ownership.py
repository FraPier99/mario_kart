from sqlalchemy.orm import Session

from app.core.timezone import now_rome
from app.data.consoles import CONSOLE_KEYS, R4_DEVICE_KEYS, MKDS_GAME_ID


def get_my_ownership(db: Session, user_id: int) -> dict:
    """Snapshot completo per un utente: ogni Game esistente unito alle
    quantità dichiarate dall'utente (default 0 per i giochi mai toccati)."""
    from app.models import User, Game, UserGameOwnership, UserConsoleOwnership, UserR4Device

    user = db.query(User).filter(User.id == user_id).first()

    games = db.query(Game).order_by(Game.id.asc()).all()
    quantity_by_game_id = {
        row.game_id: row.quantity
        for row in db.query(UserGameOwnership)
        .filter(UserGameOwnership.user_id == user_id)
        .all()
    }
    consoles = [
        {"key": row.console_key, "quantity": row.quantity}
        for row in db.query(UserConsoleOwnership)
        .filter(UserConsoleOwnership.user_id == user_id)
        .all()
    ]
    r4_devices = [
        {"key": row.device_type, "quantity": row.quantity}
        for row in db.query(UserR4Device)
        .filter(UserR4Device.user_id == user_id)
        .all()
    ]

    return {
        "games": [
            {
                "game_id": game.id,
                "game_name": game.name,
                "quantity": quantity_by_game_id.get(game.id, 0),
            }
            for game in games
        ],
        "consoles": consoles,
        "r4_devices": r4_devices,
        "has_declared": user.ownership_declared_at is not None,
    }


def replace_my_ownership(
    db: Session,
    user_id: int,
    games: dict[int, int],
    consoles: dict[str, int],
    r4_device_quantities: dict[str, int],
) -> dict:
    """Sostituzione completa dello stato di possesso di un utente. Solleva
    ValueError su input non valido (il controller lo converte in HTTP 400)."""
    from app.models import User, Game, UserGameOwnership, UserConsoleOwnership, UserR4Device

    valid_game_ids = {game_id for (game_id,) in db.query(Game.id).all()}
    for game_id, quantity in games.items():
        if game_id not in valid_game_ids:
            raise ValueError(f"Gioco con id {game_id} non trovato")
        if quantity < 0:
            raise ValueError("La quantità non può essere negativa")

    invalid_consoles = set(consoles) - CONSOLE_KEYS
    if invalid_consoles:
        raise ValueError(f"Console non valide: {', '.join(sorted(invalid_consoles))}")
    for quantity in consoles.values():
        if quantity < 0:
            raise ValueError("La quantità non può essere negativa")

    # Almeno una console è obbligatoria (i giochi/R4 possono restare a 0): il
    # payload vince sullo stato esistente per le chiavi che contiene.
    existing_consoles = {
        row.console_key: row.quantity
        for row in db.query(UserConsoleOwnership)
        .filter(UserConsoleOwnership.user_id == user_id)
        .all()
    }
    merged_consoles = {**existing_consoles, **consoles}
    if not any(quantity > 0 for quantity in merged_consoles.values()):
        raise ValueError("Seleziona almeno una console che possiedi")

    invalid_r4 = set(r4_device_quantities) - R4_DEVICE_KEYS
    if invalid_r4:
        raise ValueError(
            f"Dispositivi R4 non validi: {', '.join(sorted(invalid_r4))}"
        )
    for quantity in r4_device_quantities.values():
        if quantity < 0:
            raise ValueError("La quantità non può essere negativa")

    # I dispositivi R4 richiedono il possesso di MKDS nello stato risultante:
    # il payload vince sullo stato esistente se game_id 1 è presente nella richiesta.
    if MKDS_GAME_ID in games:
        mkds_quantity = games[MKDS_GAME_ID]
    else:
        existing_mkds = (
            db.query(UserGameOwnership.quantity)
            .filter(
                UserGameOwnership.user_id == user_id,
                UserGameOwnership.game_id == MKDS_GAME_ID,
            )
            .scalar()
        )
        mkds_quantity = existing_mkds or 0

    has_r4_requested = any(q > 0 for q in r4_device_quantities.values())
    if has_r4_requested and mkds_quantity <= 0:
        raise ValueError(
            "Devi possedere Mario Kart DS per aggiungere dispositivi R4 compatibili"
        )

    for game_id, quantity in games.items():
        row = (
            db.query(UserGameOwnership)
            .filter(
                UserGameOwnership.user_id == user_id,
                UserGameOwnership.game_id == game_id,
            )
            .first()
        )
        if row:
            row.quantity = quantity
        else:
            db.add(UserGameOwnership(user_id=user_id, game_id=game_id, quantity=quantity))

    for console_key, quantity in consoles.items():
        row = (
            db.query(UserConsoleOwnership)
            .filter(
                UserConsoleOwnership.user_id == user_id,
                UserConsoleOwnership.console_key == console_key,
            )
            .first()
        )
        if row:
            row.quantity = quantity
        else:
            db.add(UserConsoleOwnership(user_id=user_id, console_key=console_key, quantity=quantity))

    for device_type, quantity in r4_device_quantities.items():
        row = (
            db.query(UserR4Device)
            .filter(
                UserR4Device.user_id == user_id,
                UserR4Device.device_type == device_type,
            )
            .first()
        )
        if row:
            row.quantity = quantity
        else:
            db.add(UserR4Device(user_id=user_id, device_type=device_type, quantity=quantity))

    user = db.query(User).filter(User.id == user_id).first()
    user.ownership_declared_at = now_rome()

    db.commit()
    return get_my_ownership(db, user_id)


def get_all_ownership(db: Session) -> list[dict]:
    """Panoramica per il superadmin: un record per ogni utente con le
    quantità di giochi, console e dispositivi R4 dichiarate."""
    from app.models import User, Game, UserGameOwnership, UserConsoleOwnership, UserR4Device

    games = db.query(Game).order_by(Game.id.asc()).all()
    users = db.query(User).order_by(User.username.asc()).all()

    games_by_user: dict[int, dict[int, int]] = {}
    for row in db.query(UserGameOwnership).all():
        games_by_user.setdefault(row.user_id, {})[row.game_id] = row.quantity

    consoles_by_user: dict[int, list[dict]] = {}
    for row in db.query(UserConsoleOwnership).all():
        consoles_by_user.setdefault(row.user_id, []).append(
            {"key": row.console_key, "quantity": row.quantity}
        )

    r4_by_user: dict[int, list[dict]] = {}
    for row in db.query(UserR4Device).all():
        r4_by_user.setdefault(row.user_id, []).append(
            {"key": row.device_type, "quantity": row.quantity}
        )

    result = []
    for user in users:
        quantity_map = games_by_user.get(user.id, {})
        result.append(
            {
                "user_id": user.id,
                "username": user.username,
                "player_nickname": user.player.nickname if user.player else None,
                "games": [
                    {
                        "game_id": game.id,
                        "game_name": game.name,
                        "quantity": quantity_map.get(game.id, 0),
                    }
                    for game in games
                ],
                "consoles": consoles_by_user.get(user.id, []),
                "r4_devices": r4_by_user.get(user.id, []),
            }
        )
    return result
