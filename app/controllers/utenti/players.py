from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import require_roles
from app.services.utenti.audit_log import log_action
from app.services.utenti.players import (
    create_player,
    delete_player,
    get_all_players,
    get_player,
    update_player,
)
from app.models import Player
from app.controllers.utenti.schemas.players import CreatePlayer, PlayerResponse, UpdatePlayer


router = APIRouter(prefix="/players", tags=["Players"])


@router.get("", response_model=list[PlayerResponse])
def all_players(db: Session = Depends(get_db)):
    return get_all_players(db)


@router.post("", status_code=201, response_model=PlayerResponse)
def insert_player(
    player: CreatePlayer,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    try:
        return create_player(db, player)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Nickname already exists")
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(error))


@router.delete("/{player_id}")
def delete_player_by_id(
    player_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    deleted_player = delete_player(db, player_id)

    if not deleted_player:
        raise HTTPException(status_code=404, detail="Player not found")

    return {"message": "player deleted successfully"}


@router.get("/{player_id}", response_model=PlayerResponse)
def get_player_by_id(player_id: int, db: Session = Depends(get_db)):
    player = get_player(db, player_id)

    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"player with id {player_id}  not found",
        )

    return player


@router.put("/{player_id}", response_model=PlayerResponse)
def update_player_by_id(
    player_id: int,
    player: UpdatePlayer,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    try:
        updated_player = update_player(db, player, player_id)

        if not updated_player:
            raise HTTPException(
                status_code=404, detail=f"player with id {player_id} not found"
            )

        return updated_player
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This nickname already exists or the ID is not valid",
        )
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


from pydantic import BaseModel


class ChampionPhotoPayload(BaseModel):
    image_data: str


@router.put("/{player_id}/champion-photo")
def upload_champion_photo(
    player_id: int,
    payload: ChampionPhotoPayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin")),
):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Giocatore non trovato")
    player.champion_photo = payload.image_data
    db.commit()
    log_action(
        db,
        action="champion_photo_uploaded",
        description=f"Foto campione caricata per '{player.nickname}' (id={player_id})",
        actor_user_id=current_user.id,
        target_type="player",
        target_id=player_id,
    )
    return {
        "message": "Foto campione caricata",
        "champion_photo": player.champion_photo,
    }
