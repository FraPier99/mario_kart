from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import require_roles
from app.services.tornei.characters import get_character, get_characters, update_character
from app.controllers.tornei.schemas.characters import CharacterResponse, UpdateCharacter


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


@router.put("/{character_id}", response_model=CharacterResponse)
def update_character_by_id(
    character_id: int,
    payload: UpdateCharacter,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    try:
        updated = update_character(db, payload, character_id)
        if not updated:
            raise HTTPException(
                status_code=404, detail=f"character with id {character_id} not found"
            )
        return updated
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esiste già un personaggio con questo nome per questo gioco",
        )
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
