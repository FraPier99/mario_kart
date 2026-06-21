from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.services.tornei.games import (
    create_game,
    delete_game,
    get_all_games,
    get_game,
    update_game,
)
from app.controllers.tornei.schemas.games import CreateGame, GameResponse, UpdateGame


router = APIRouter(prefix="/games", tags=["Games"])


@router.post("", response_model=GameResponse, status_code=201)
def insert_game(gameData: CreateGame, db: Session = Depends(get_db)):
    try:
        return create_game(db, gameData)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game with this name already exists",
        )


@router.get("/{game_id}", response_model=GameResponse)
def get_game_by_id(game_id: int, db: Session = Depends(get_db)):
    game = get_game(db, game_id)

    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game with id {game_id} not found",
        )

    return game


@router.put("/{game_id}", response_model=GameResponse)
def update_game_by_id(
    game_id: int, gameData: UpdateGame, db: Session = Depends(get_db)
):
    try:
        game = update_game(db, gameData, game_id)

        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with id {game_id} not found",
            )

        return game
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game with this name already exists",
        )


@router.get("", response_model=list[GameResponse])
def get_games(db: Session = Depends(get_db)):
    return get_all_games(db)


@router.delete("/{game_id}")
def delete_game_by_id(game_id: int, db: Session = Depends(get_db)):
    game = delete_game(db, game_id)

    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game with id {game_id} not found",
        )

    return {"message": "Game deleted successfully"}
