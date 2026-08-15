from typing import Optional
from sqlalchemy.orm import Session
from app.models import Character
from app.controllers.tornei.schemas.characters import UpdateCharacter


def get_characters(db: Session, game_id: Optional[int] = None):
    q = db.query(Character)
    if game_id is not None:
        q = q.filter(Character.game_id == game_id)
    return q.all()


def get_character(db: Session, character_id: int):
    return db.query(Character).filter(Character.id == character_id).first()


def update_character(db: Session, character_data: UpdateCharacter, character_id: int):
    character = db.query(Character).filter(Character.id == character_id).first()
    if not character:
        return None

    update_data = character_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(character, key, value)

    db.commit()
    db.refresh(character)
    return character
