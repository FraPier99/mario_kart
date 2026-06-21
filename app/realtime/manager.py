import asyncio
import base64
import hashlib
import hmac
import json
import logging
import time

import socketio

from app.core.config import SECRET_KEY

logger = logging.getLogger(__name__)

_sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
)

# The main-thread event loop, populated at app startup so sync code can
# schedule async socket emits via asyncio.run_coroutine_threadsafe.
_loop: asyncio.AbstractEventLoop | None = None


def init_loop(loop: asyncio.AbstractEventLoop):
    global _loop
    _loop = loop


def _decode_token_safe(token: str) -> dict | None:
    try:
        encoded, signature = token.rsplit(".", 1)
    except (ValueError, AttributeError):
        return None
    expected_sig = hmac.new(
        SECRET_KEY.encode("utf-8"),
        encoded.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_sig):
        return None
    padding = "=" * (-len(encoded) % 4)
    try:
        payload = json.loads(
            base64.urlsafe_b64decode((encoded + padding).encode("utf-8")).decode(
                "utf-8"
            )
        )
    except Exception:
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    return payload


@_sio.event
async def connect(sid, environ, auth=None):
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get("token")
    if not token and isinstance(environ, dict):
        query = environ.get("QUERY_STRING", "")
        for part in query.split("&"):
            if part.startswith("token="):
                token = part.split("=", 1)[1]
                break
    if not token:
        logger.warning("Socket connection rejected: no token")
        raise socketio.exceptions.ConnectionRefusedError("authentication required")
    payload = _decode_token_safe(token)
    if not payload:
        logger.warning("Socket connection rejected: invalid token")
        raise socketio.exceptions.ConnectionRefusedError("invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise socketio.exceptions.ConnectionRefusedError("invalid token payload")
    _sio.enter_room(sid, f"user:{user_id}")

    # Pending celebrations: emit tournament:winner for any concluded
    # tournament the user hasn't acknowledged yet (handles reconnections
    # and first-login-after-winner scenarios).
    try:
        from app.core.db import SessionLocal
        from app.models import Notification, Tournament, Player

        _db = SessionLocal()
        try:
            notif = (
                _db.query(Notification)
                .filter(
                    Notification.user_id == user_id,
                    Notification.type == "tournament_ended",
                    Notification.is_read == False,
                )
                .order_by(Notification.created_at.desc())
                .first()
            )
            if notif:
                t = (
                    _db.query(Tournament)
                    .filter(Tournament.id == notif.source_tournament_id)
                    .first()
                )
                if t and t.winner_id:
                    winner = _db.query(Player).filter(Player.id == t.winner_id).first()
                    await _sio.emit(
                        "tournament:winner",
                        {
                            "tournament_id": t.id,
                            "tournament_name": t.name,
                            "winner_id": t.winner_id,
                            "winner_nickname": winner.nickname if winner else "—",
                            "winner_img_url": winner.img_url if winner else None,
                        },
                        room=sid,
                    )
        finally:
            _db.close()
    except Exception:
        logger.warning("Failed to emit pending celebration", exc_info=True)

    logger.info("Socket connected user=%s sid=%s", user_id, sid)


@_sio.event
async def disconnect(sid):
    logger.info("Socket disconnected sid=%s", sid)


# ---------------------------------------------------------------------------
# Public helpers — safe to call from sync or async code
# ---------------------------------------------------------------------------


def emit_to_user_sync(user_id: int, event: str, data: dict):
    """Fire-and-forget emit to a single user (safe from sync endpoints)."""
    if _loop is None or not _loop.is_running():
        return
    asyncio.run_coroutine_threadsafe(
        _sio.emit(event, data, room=f"user:{user_id}"),
        _loop,
    )


async def emit_to_user_async(user_id: int, event: str, data: dict):
    """Awaitable emit to a single user."""
    await _sio.emit(event, data, room=f"user:{user_id}")


def broadcast_tournament_winner_sync(db, tournament_id: int, winner_data: dict):
    """Look up all participant user_ids for a tournament and emit
    tournament:winner to each user's room.  Safe from sync endpoints."""
    if _loop is None or not _loop.is_running():
        return
    from app.models import TournamentPlayer, User

    pids = [
        r.player_id
        for r in db.query(TournamentPlayer.player_id)
        .filter(TournamentPlayer.tournament_id == tournament_id)
        .all()
    ]
    if not pids:
        return
    uids = [
        r.id
        for r in db.query(User.id)
        .filter(User.player_id.in_(pids), User.player_id.isnot(None))
        .all()
    ]
    for uid in uids:
        asyncio.run_coroutine_threadsafe(
            _sio.emit("tournament:winner", winner_data, room=f"user:{uid}"),
            _loop,
        )


def get_sio() -> socketio.AsyncServer:
    return _sio
