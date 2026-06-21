from sqlalchemy.orm import Session
from app.models import Game
from app.controllers.tornei.schemas.games import CreateGame, UpdateGame


def create_game(db: Session, gameData: CreateGame):
    new_game = Game(**gameData.model_dump())

    db.add(new_game)
    db.commit()
    db.refresh(new_game)
    return new_game


def get_game(db: Session, game_id: int):
    game = db.query(Game).filter(Game.id == game_id).first()

    if not game:
        return None

    return game


def update_game(db: Session, gameData: UpdateGame, game_id: int):
    game = db.query(Game).filter(Game.id == game_id).first()

    if not game:
        return None

    game_update = gameData.model_dump(exclude_unset=True)

    for key, value in game_update.items():
        setattr(game, key, value)

    db.commit()
    db.refresh(game)

    return game


def get_all_games(db: Session):
    return db.query(Game).all()


def delete_game(db: Session, game_id: int):
    game = db.query(Game).filter(Game.id == game_id).first()

    if not game:
        return None

    db.delete(game)
    db.commit()
    return game
