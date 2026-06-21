from typing import Optional
from sqlalchemy.orm import Session
from app.models import Character


def get_characters(db: Session, game_id: Optional[int] = None):
    q = db.query(Character)
    if game_id is not None:
        q = q.filter(Character.game_id == game_id)
    return q.all()


def get_character(db: Session, character_id: int):
    return db.query(Character).filter(Character.id == character_id).first()
