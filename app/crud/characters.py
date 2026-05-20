from sqlalchemy.orm import Session
from model import Character


def get_characters(db: Session):
    return db.query(Character).all()


def get_character(db: Session, character_id: int):
    return db.query(Character).filter(Character.id == character_id).first()
