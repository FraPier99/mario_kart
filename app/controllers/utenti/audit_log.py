import secrets
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import hash_password, require_roles
from app.services.utenti.audit_log import get_logs, log_action
from app.models import TempPassword, User

router = APIRouter(prefix="/audit-log", tags=["AuditLog"])


class AuditLogEntry(BaseModel):
    id: int
    actor_user_id: int | None = None
    actor_username: str | None = None
    action: str
    target_type: str | None = None
    target_id: int | None = None
    description: str
    created_at: str

    model_config = {"from_attributes": True}


@router.get("", response_model=list[AuditLogEntry])
def list_audit_log(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin")),
):
    logs = get_logs(db, limit=200)
    result = []
    for entry in logs:
        actor_username = None
        if entry.actor:
            actor_username = entry.actor.username
        result.append(
            AuditLogEntry(
                id=entry.id,
                actor_user_id=entry.actor_user_id,
                actor_username=actor_username,
                action=entry.action,
                target_type=entry.target_type,
                target_id=entry.target_id,
                description=entry.description,
                created_at=entry.created_at.isoformat(),
            )
        )
    return result


class ResetPasswordResponse(BaseModel):
    temp_password: str
    username: str


def store_temp_password(db: Session, user_id: int, temp_pw: str):
    now = datetime.utcnow()
    tp = TempPassword(
        user_id=user_id,
        temp_password=temp_pw,
        created_at=now,
        expires_at=now + timedelta(hours=48),
    )
    db.add(tp)
    db.flush()


@router.post("/users/{user_id}/reset-password", response_model=ResetPasswordResponse)
def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    alphabet = string.ascii_letters + string.digits
    temp_pw = "".join(secrets.choice(alphabet) for _ in range(10))

    user.password_hash = hash_password(temp_pw)
    user.must_change_password = True
    store_temp_password(db, user_id, temp_pw)
    db.commit()

    log_action(
        db,
        action="password_reset",
        description=f"Password reimpostata per l'utente '{user.username}' (id={user_id})",
        actor_user_id=current_user.id,
        target_type="user",
        target_id=user_id,
    )

    return ResetPasswordResponse(temp_password=temp_pw, username=user.username)


class TempPasswordEntry(BaseModel):
    id: int
    user_id: int
    temp_password: str
    created_at: str
    expires_at: str

    model_config = {"from_attributes": True}


@router.get("/users/{user_id}/temp-passwords", response_model=list[TempPasswordEntry])
def get_user_temp_passwords(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin")),
):
    now = datetime.utcnow()
    entries = (
        db.query(TempPassword)
        .filter(TempPassword.user_id == user_id, TempPassword.expires_at > now)
        .order_by(TempPassword.created_at.desc())
        .all()
    )
    return entries
