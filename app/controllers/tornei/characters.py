from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.services.tornei.characters import get_character, get_characters
from app.controllers.tornei.schemas.characters import CharacterResponse


router = APIRouter(prefix="/characters", tags=["Characters"])


@router.get("", response_model=list[CharacterResponse])
def all_characters(game_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return get_characters(db, game_id=game_id)


@router.get("/{character_id}", response_model=CharacterResponse)
def get_character_by_id(character_id: int, db: Session = Depends(get_db)):
    character = get_character(db, character_id)

    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Character with id {character_id} not found",
        )

    return character
