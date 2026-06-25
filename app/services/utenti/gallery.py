from datetime import datetime
from app.core.timezone import now_rome

from sqlalchemy.orm import Session, joinedload

from app.core.media import to_image_url
from app.models import Notification, PhotoComment, Player, Tournament, TournamentPhoto, User
from app.controllers.utenti.schemas.gallery import (
    PhotoCommentCreate,
    PhotoCommentUpdate,
    TournamentPhotoCreate,
)
from app.services.utenti.notifications import (
    create_mention_notifications,
    create_reply_notification,
)


def _serialize_photo(photo: TournamentPhoto) -> dict:
    return {
        "id": photo.id,
        "tournament_id": photo.tournament_id,
        "tournament_name": photo.tournament.name if photo.tournament else None,
        "uploaded_by_user_id": photo.uploaded_by_user_id,
        "uploaded_by_username": photo.uploaded_by.username
        if photo.uploaded_by
        else f"user-{photo.uploaded_by_user_id}",
        "image_data": photo.image_data,
        "caption": photo.caption,
        "created_at": photo.created_at,
        "comments": [
            _serialize_comment(c)
            for c in sorted(photo.comments, key=lambda c: c.created_at)
        ],
    }


def _serialize_comment(comment: PhotoComment) -> dict:
    player = comment.user.player if comment.user and comment.user.player else None
    favorite_character = (
        player.favorite_character if player and player.favorite_character_id else None
    )
    user_img_url = comment.user.img_url if comment.user else None
    return {
        "id": comment.id,
        "photo_id": comment.photo_id,
        "user_id": comment.user_id,
        "username": comment.user.username
        if comment.user
        else f"user-{comment.user_id}",
        "nickname": player.nickname if player else None,
        # Stessa trasformazione base64→URL di PlayerResponse (app.core.media):
        # senza, lo stesso avatar da ~1MB si ripeteva una volta per ogni
        # commento di quella persona dentro la risposta di /gallery.
        "img_url": to_image_url(f"/players/{player.id}/avatar", player.img_url) if player else None,
        "user_img_url": user_img_url,
        "favorite_character_img_url": favorite_character.img_url
        if favorite_character
        else None,
        "text": comment.text,
        "image_data": comment.image_data,
        "parent_id": comment.parent_id,
        "created_at": comment.created_at,
        "edited_by_username": comment.edited_by.username if comment.edited_by else None,
        "edited_at": comment.edited_at,
    }


def get_photos(db: Session) -> list[dict]:
    photos = (
        db.query(TournamentPhoto)
        .options(
            joinedload(TournamentPhoto.uploaded_by),
            joinedload(TournamentPhoto.comments)
            .joinedload(PhotoComment.user)
            .joinedload(User.player)
            .joinedload(Player.favorite_character),
            joinedload(TournamentPhoto.comments).joinedload(PhotoComment.edited_by),
        )
        .order_by(TournamentPhoto.created_at.desc())
        .all()
    )
    return [_serialize_photo(p) for p in photos]


def get_photo(db: Session, photo_id: int) -> dict | None:
    photo = (
        db.query(TournamentPhoto)
        .options(
            joinedload(TournamentPhoto.uploaded_by),
            joinedload(TournamentPhoto.comments)
            .joinedload(PhotoComment.user)
            .joinedload(User.player)
            .joinedload(Player.favorite_character),
            joinedload(TournamentPhoto.comments).joinedload(PhotoComment.edited_by),
        )
        .filter(TournamentPhoto.id == photo_id)
        .first()
    )
    return _serialize_photo(photo) if photo else None


def create_photo(db: Session, user_id: int, payload: TournamentPhotoCreate) -> dict:
    photo = TournamentPhoto(
        tournament_id=payload.tournament_id,
        uploaded_by_user_id=user_id,
        image_data=payload.image_data,
        caption=payload.caption,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return _serialize_photo(photo)


def delete_photo(db: Session, photo_id: int) -> bool:
    photo = db.query(TournamentPhoto).filter(TournamentPhoto.id == photo_id).first()
    if not photo:
        return False
    # Notification.source_photo_id non ha ON DELETE CASCADE: una menzione
    # @utente in un commento di questa foto crea una notifica collegata che,
    # se non ancora eliminata dal destinatario, blocca il delete della foto
    # con un ForeignKeyViolation.
    db.query(Notification).filter(Notification.source_photo_id == photo_id).delete()
    db.delete(photo)
    db.commit()
    return True


def add_comment(
    db: Session, photo_id: int, user_id: int, payload: PhotoCommentCreate
) -> dict | None:
    if not db.query(TournamentPhoto).filter(TournamentPhoto.id == photo_id).first():
        return None
    text = payload.text.strip()
    image_data = payload.image_data or None
    if not text and not image_data:
        raise ValueError("Il commento deve contenere del testo o un'immagine")
    parent_id = payload.parent_id
    comment = PhotoComment(
        photo_id=photo_id,
        user_id=user_id,
        text=text,
        image_data=image_data,
        parent_id=parent_id,
    )
    db.add(comment)
    db.flush()
    create_mention_notifications(db, text, user_id, source_photo_id=photo_id)
    if parent_id is not None:
        create_reply_notification(db, comment, user_id)
    db.commit()
    db.refresh(comment)
    return _serialize_comment(comment)


def edit_comment(
    db: Session, comment_id: int, editor_user_id: int, payload: PhotoCommentUpdate
) -> dict | None:
    comment = db.query(PhotoComment).filter(PhotoComment.id == comment_id).first()
    if not comment:
        return None
    comment.text = payload.text.strip()
    comment.edited_by_user_id = editor_user_id
    comment.edited_at = now_rome()
    db.commit()
    db.refresh(comment)
    return _serialize_comment(comment)


def delete_comment(db: Session, comment_id: int) -> bool:
    comment = db.query(PhotoComment).filter(PhotoComment.id == comment_id).first()
    if not comment:
        return False
    db.delete(comment)
    db.commit()
    return True
