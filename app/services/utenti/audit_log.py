from sqlalchemy.orm import Session

from app.models import AuditLog


def log_action(
    db: Session,
    action: str,
    description: str,
    actor_user_id: int | None = None,
    target_type: str | None = None,
    target_id: int | None = None,
):
    entry = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        description=description,
    )
    db.add(entry)
    db.commit()


def get_logs(db: Session, limit: int = 200):
    return (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
