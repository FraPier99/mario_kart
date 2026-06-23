import re
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import Notification, PhotoComment, Player, User


def _parse_mentions(text: str) -> list[str]:
    """Extract @nickname strings from comment text."""
    return re.findall(r"@([\w\-\.]+)", text)


def create_mention_notifications(
    db: Session,
    text: str,
    source_user_id: int,
    source_photo_id: int | None = None,
):
    """Parse text for @mentions and create a notification for each tagged user."""
    mentions = _parse_mentions(text)
    if not mentions:
        return

    source_user = db.query(User).filter(User.id == source_user_id).first()
    source_name = source_user.username if source_user else f"user-{source_user_id}"

    notified_ids: set[int] = set()
    for nickname in mentions:
        player = db.query(Player).filter(Player.nickname.ilike(nickname)).first()
        if not player or not player.user_account:
            continue
        target_user = player.user_account
        if target_user.id == source_user_id:
            continue
        if target_user.id in notified_ids:
            continue
        notified_ids.add(target_user.id)

        notif = Notification(
            user_id=target_user.id,
            type="mention",
            content=f"@{source_name} ti ha menzionato in un commento.",
            source_user_id=source_user_id,
            source_photo_id=source_photo_id,
        )
        db.add(notif)

    db.flush()


def create_reply_notification(
    db: Session,
    comment: PhotoComment,
    source_user_id: int,
):
    """Create a notification for the parent comment author when someone replies,
    unless the reply already contains an @mention of the parent author."""
    if not comment.parent_id:
        return
    parent = db.query(PhotoComment).filter(PhotoComment.id == comment.parent_id).first()
    if not parent or parent.user_id == source_user_id:
        return

    # Don't double-notify if the reply already @mentions the parent author
    parent_player = parent.user.player if parent.user else None
    parent_nickname = parent_player.nickname if parent_player else None
    if parent_nickname and f"@{parent_nickname.lower()}" in comment.text.lower():
        return

    source_user = db.query(User).filter(User.id == source_user_id).first()
    source_name = source_user.username if source_user else f"user-{source_user_id}"

    notif = Notification(
        user_id=parent.user_id,
        type="comment_reply",
        content=f"@{source_name} ti ha risposto in un commento.",
        source_user_id=source_user_id,
        source_photo_id=comment.photo_id,
    )
    db.add(notif)
    db.flush()


def create_tournament_notifications(
    db: Session,
    tournament_id: int,
    notif_type: str,
    content: str,
) -> None:
    """Send a notification of the given type to all users linked to tournament participants."""
    from app.models import Tournament, TournamentPlayer

    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not t:
        return

    participant_ids = [
        link.player_id
        for link in db.query(TournamentPlayer)
        .filter(TournamentPlayer.tournament_id == tournament_id)
        .all()
    ]
    if not participant_ids:
        return

    user_ids = [
        u.id
        for u in db.query(User)
        .filter(User.player_id.in_(participant_ids), User.player_id.isnot(None))
        .all()
    ]

    for uid in user_ids:
        notif = Notification(
            user_id=uid,
            type=notif_type,
            content=content,
            source_tournament_id=tournament_id,
        )
        db.add(notif)

    db.flush()


def create_single_notification(
    db: Session,
    user_id: int,
    notif_type: str,
    content: str,
    source_tournament_id: int | None = None,
    source_user_id: int | None = None,
) -> None:
    """Create a single notification for one specific user."""
    notif = Notification(
        user_id=user_id,
        type=notif_type,
        content=content,
        source_tournament_id=source_tournament_id,
        source_user_id=source_user_id,
    )
    db.add(notif)
    db.flush()


def get_user_notifications(db: Session, user_id: int) -> list[dict]:
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [_serialize(n) for n in notifs]


def mark_read(db: Session, notification_id: int, user_id: int) -> bool:
    n = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        .first()
    )
    if not n:
        return False
    n.is_read = True
    db.commit()
    return True


def mark_all_read(db: Session, user_id: int):
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()


def unread_count(db: Session, user_id: int) -> int:
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
        .count()
    )


def delete_read_notifications(db: Session, user_id: int) -> int:
    """Elimina le notifiche già lette dell'utente (pulizia all'apertura)."""
    deleted = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == True)
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted


def delete_all_notifications(db: Session, user_id: int) -> int:
    """Elimina tutte le notifiche dell'utente ('Cancella tutte')."""
    deleted = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted


def delete_notification(db: Session, notification_id: int, user_id: int) -> bool:
    n = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        .first()
    )
    if not n:
        return False
    db.delete(n)
    db.commit()
    return True


def _serialize(n: Notification) -> dict:
    link = None
    if n.type in ("mention", "gallery_mention", "comment_reply") and n.source_photo_id:
        link = f"/gallery?photo={n.source_photo_id}"
    elif n.type in ("gallery_mention", "comment_reply"):
        link = "/gallery"
    elif n.source_tournament_id:
        if n.type == "schedina_winner":
            link = f"/schedina/{n.source_tournament_id}"
        elif n.type == "schedina_pending":
            link = None  # handled by frontend with tournament_format
        else:
            link = f"/tournaments/{n.source_tournament_id}"

    return {
        "id": n.id,
        "type": n.type,
        "content": n.content,
        "link": link,
        "is_read": n.is_read,
        "created_at": n.created_at,
        "source_user_id": n.source_user_id,
        "source_photo_id": n.source_photo_id,
        "source_tournament_id": n.source_tournament_id,
    }
