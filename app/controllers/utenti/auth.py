from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import create_access_token, get_current_user, require_roles
from app.services.utenti.audit_log import log_action
from app.controllers.utenti.audit_log import store_temp_password
from app.services.utenti.players import update_player
from app.services.utenti.users import (
    change_user_password,
    create_user,
    delete_user,
    get_user_by_id,
    get_user_by_login_identifier,
    list_users,
    update_user,
    validate_user_password,
)
from app.controllers.utenti.schemas.auth import (
    ChangePasswordRequest,
    CreateUser,
    LoginRequest,
    TokenResponse,
    UpdateMyProfile,
    UpdateUser,
    UserResponse,
)
from app.controllers.utenti.schemas.players import UpdatePlayer


router = APIRouter(prefix="/auth", tags=["Auth"])


def _load_player(user):
    if user and getattr(user, "player", None):
        return user
    return user


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    # Accetta sia il nickname/username sia "nome_cognome" del giocatore collegato.
    user = get_user_by_login_identifier(db, login_data.username)
    if not user or not validate_user_password(user, login_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenziali non valide"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account disattivato"
        )

    log_action(
        db,
        action="login",
        description=f"Accesso di '{user.username}'",
        actor_user_id=user.id,
        target_type="user",
        target_id=user.id,
    )

    return {
        "access_token": create_access_token(user.id, user.role),
        "user": user,
    }


@router.get("/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout():
    return {"message": "Logged out"}


@router.get("/users", response_model=list[UserResponse])
def read_users(
    db: Session = Depends(get_db), current_user=Depends(require_roles("superadmin"))
):
    return list_users(db)


@router.get("/community/users", response_model=list[UserResponse])
def read_community_users(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    return [user for user in list_users(db) if user.is_active and user.player_id]


@router.get("/community/users/{user_id}", response_model=UserResponse)
def read_community_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = get_user_by_id(db, user_id)
    if not user or not user.is_active or not user.player_id:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return user


@router.post("/users", response_model=UserResponse, status_code=201)
def insert_user(
    user_data: CreateUser,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin")),
):
    try:
        new_user = create_user(db, user_data)
        store_temp_password(db, new_user.id, user_data.password)
        db.commit()
        log_action(
            db,
            action="user_created",
            description=f"Account '{new_user.username}' (ruolo: {new_user.role}) creato da '{current_user.username}'",
            actor_user_id=current_user.id,
            target_type="user",
            target_id=new_user.id,
        )
        return new_user
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username o player già associato")


@router.put("/users/{user_id}", response_model=UserResponse)
def modify_user(
    user_id: int,
    user_data: UpdateUser,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin")),
):
    try:
        updated = update_user(db, user_id, user_data)
        if not updated:
            raise HTTPException(status_code=404, detail="User not found")
        data = user_data.model_dump(exclude_unset=True)
        if "role" in data:
            log_action(
                db,
                action="user_role_changed",
                description=f"Ruolo di '{updated.username}' cambiato a '{updated.role}' da '{current_user.username}'",
                actor_user_id=current_user.id,
                target_type="user",
                target_id=user_id,
            )
        return updated
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username already exists")


@router.delete("/users/{user_id}", response_model=UserResponse)
def delete_user_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin")),
):
    if current_user.id == user_id:
        raise HTTPException(
            status_code=400, detail="Non puoi eliminare il tuo stesso account"
        )
    try:
        deleted = delete_user(db, user_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    log_action(
        db,
        action="user_deleted",
        description=f"Account '{deleted.username}' eliminato da '{current_user.username}'",
        actor_user_id=current_user.id,
        target_type="user",
        target_id=user_id,
    )
    return deleted


@router.post("/me/change-password")
def change_my_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not body.force and body.current_password is None:
        raise HTTPException(
            status_code=400,
            detail="La password corrente è richiesta per il cambio password",
        )

    try:
        updated = change_user_password(
            db,
            current_user.id,
            body.new_password,
            current_password=body.current_password,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Utente non trovato")
        return {"message": "Password aggiornata con successo"}
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.put("/me/profile")
def update_my_profile(
    profile_data: UpdateMyProfile,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app.models import Player
    from app.services.utenti.players import sanitize_nickname

    try:
        # Auto-create a Player for superadmin without linked player
        if not current_user.player_id:
            raw_nickname = profile_data.nickname or current_user.username
            nickname = sanitize_nickname(raw_nickname)
            if not nickname:
                raise ValueError(
                    "Il nickname deve contenere almeno un carattere alfanumerico"
                )
            if db.query(Player).filter(Player.nickname == nickname).first():
                raise ValueError(f"Il nickname '{nickname}' è già in uso")

            player = Player(
                first_name=profile_data.first_name or "",
                last_name=profile_data.last_name or "",
                nickname=nickname,
                img_url=profile_data.img_url,
                favorite_character_id=profile_data.favorite_character_id,
            )
            db.add(player)
            db.flush()
            current_user.player_id = player.id
            db.commit()
            db.refresh(current_user)
            return player

        update_payload = UpdatePlayer(
            first_name=profile_data.first_name,
            last_name=profile_data.last_name,
            nickname=profile_data.nickname,
            favorite_character_id=profile_data.favorite_character_id,
            img_url=profile_data.img_url,
            bio=profile_data.bio,
        )
        player = update_player(db, update_payload, current_user.player_id)
        if not player:
            raise HTTPException(status_code=404, detail="Profilo non trovato")
        return player
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
