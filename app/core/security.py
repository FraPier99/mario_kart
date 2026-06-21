import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Callable, Literal

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY
from app.core.db import get_db


AUTH_SCHEME = HTTPBearer(auto_error=False)
VALID_ROLES = {"superadmin", "admin", "user"}


def normalize_role(role: str) -> str:
    normalized = (role or "user").strip().lower()
    if normalized not in VALID_ROLES:
        raise ValueError("Invalid role")
    return normalized


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, digest = stored_hash.split("$", 1)
    except ValueError:
        return False

    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000).hex()
    return hmac.compare_digest(candidate, digest)


def create_access_token(user_id: int, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": normalize_role(role),
        "exp": int(time.time()) + (ACCESS_TOKEN_EXPIRE_MINUTES * 60),
    }
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    encoded = base64.urlsafe_b64encode(raw).rstrip(b"=")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), encoded, hashlib.sha256).hexdigest()
    return f"{encoded.decode('utf-8')}.{signature}"


def decode_access_token(token: str) -> dict:
    try:
        encoded, signature = token.rsplit(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token non valido") from exc

    expected_signature = hmac.new(SECRET_KEY.encode("utf-8"), encoded.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token non valido")

    padding = "=" * (-len(encoded) % 4)
    try:
        payload = json.loads(base64.urlsafe_b64decode((encoded + padding).encode("utf-8")).decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token non valido") from exc

    if int(payload.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessione scaduta")

    return payload


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(AUTH_SCHEME),
    db: Session = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticazione richiesta")

    payload = decode_access_token(credentials.credentials)
    from app.services.utenti.users import get_user_by_id

    user = get_user_by_id(db, int(payload.get("sub", 0)))

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utente non valido")

    return user


def require_roles(*allowed_roles: str) -> Callable:
    normalized_roles = {normalize_role(role) for role in allowed_roles}

    def dependency(current_user=Depends(get_current_user)):
        if current_user.role not in normalized_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permessi insufficienti")
        return current_user

    return dependency