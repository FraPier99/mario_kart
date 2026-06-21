from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user, require_roles
from app.services.utenti.gallery import (
    add_comment,
    create_photo,
    delete_comment,
    delete_photo,
    edit_comment,
    get_photos,
)
from app.controllers.utenti.schemas.gallery import (
    PhotoCommentCreate,
    PhotoCommentResponse,
    PhotoCommentUpdate,
    TournamentPhotoCreate,
    TournamentPhotoResponse,
)


router = APIRouter(prefix="/gallery", tags=["Gallery"])


@router.get("", response_model=list[TournamentPhotoResponse])
def list_photos(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return get_photos(db)


@router.post("", response_model=TournamentPhotoResponse, status_code=201)
def upload_photo(
    payload: TournamentPhotoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin")),
):
    return create_photo(db, current_user.id, payload)


@router.delete("/{photo_id}", status_code=204)
def remove_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("superadmin")),
):
    if not delete_photo(db, photo_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")


@router.post("/{photo_id}/comments", response_model=PhotoCommentResponse, status_code=201)
def post_comment(
    photo_id: int,
    payload: PhotoCommentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = add_comment(db, photo_id, current_user.id, payload)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
    return result


@router.patch("/comments/{comment_id}", response_model=PhotoCommentResponse)
def update_comment(
    comment_id: int,
    payload: PhotoCommentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin")),
):
    result = edit_comment(db, comment_id, current_user.id, payload)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    return result


@router.delete("/comments/{comment_id}", status_code=204)
def remove_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("superadmin")),
):
    if not delete_comment(db, comment_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
