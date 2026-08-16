from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.media import decode_data_url, to_image_url
from app.core.security import require_roles
from app.services.utenti.audit_log import log_action
from app.services.utenti.players import (
    create_player,
    delete_player,
    get_all_players,
    get_player,
    update_player,
)
from app.services.utenti.users import get_user_by_player_id
from app.models import Player
from app.controllers.utenti.schemas.players import CreatePlayer, PlayerResponse, UpdatePlayer


router = APIRouter(prefix="/players", tags=["Players"])


def _reject_admin_editing_privileged_player(db: Session, current_user, player_id: int):
    """Un admin (non superadmin) può modificare/eliminare solo giocatori
    collegati a account 'user' — non altri admin/superadmin. Solo il
    superadmin può farlo per chiunque."""
    if current_user.role == "superadmin":
        return
    linked_user = get_user_by_player_id(db, player_id)
    if linked_user and linked_user.role in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un superadmin può modificare un giocatore collegato a un account admin o superadmin",
        )


@router.get("", response_model=list[PlayerResponse])
def all_players(response: Response, db: Session = Depends(get_db)):
    # img_url/champion_photo sono base64 dentro la risposta: senza cache
    # vengono riscaricati per intero a ogni richiesta (lista giocatori,
    # avatar in classifica, ecc.). Endpoint pubblico (nessun Authorization),
    # quindi "public" — la stessa risposta vale per chiunque la richieda.
    response.headers["Cache-Control"] = "public, max-age=60"
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
    _reject_admin_editing_privileged_player(db, current_user, player_id)
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


def _serve_player_image(db: Session, player_id: int, raw_value: str | None) -> Response:
    if not raw_value or not raw_value.startswith("data:"):
        raise HTTPException(status_code=404, detail="Immagine non disponibile")
    mime, raw_bytes = decode_data_url(raw_value)
    return Response(
        content=raw_bytes,
        media_type=mime,
        # Cache aggressiva sicura: l'URL include un hash del contenuto
        # (vedi to_image_url in app.core.media), quindi cambia da solo
        # quando l'immagine cambia — non serve mai invalidare a mano.
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.get("/{player_id}/avatar")
def get_player_avatar(player_id: int, db: Session = Depends(get_db)):
    player = get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Giocatore non trovato")
    return _serve_player_image(db, player_id, player.img_url)


@router.get("/{player_id}/champion-photo-image")
def get_player_champion_photo_image(player_id: int, db: Session = Depends(get_db)):
    player = get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Giocatore non trovato")
    return _serve_player_image(db, player_id, player.champion_photo)


@router.put("/{player_id}", response_model=PlayerResponse)
def update_player_by_id(
    player_id: int,
    player: UpdatePlayer,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    _reject_admin_editing_privileged_player(db, current_user, player_id)
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
    # Foto campione: WebP ridimensionato (max 1000px, è una foto più grande
    # di un avatar). Vedi app.core.image_optim.
    from app.core.image_optim import optimize_image_data_url

    player.champion_photo = optimize_image_data_url(payload.image_data, max_dimension=1000)
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
        "champion_photo": to_image_url(f"/players/{player_id}/champion-photo-image", player.champion_photo),
    }
