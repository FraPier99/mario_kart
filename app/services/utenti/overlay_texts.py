from sqlalchemy.orm import Session

from app.core.timezone import now_rome


def list_overlay_texts(db: Session) -> list:
    from app.models import OverlayText

    return (
        db.query(OverlayText)
        .filter(OverlayText.data.isnot(None))
        .order_by(OverlayText.key.asc())
        .all()
    )


def get_overlay_text(db: Session, key: str):
    from app.models import OverlayText

    return db.query(OverlayText).filter(OverlayText.key == key).first()


def upsert_overlay_text(db: Session, key: str, data: dict, user_id: int):
    from app.models import OverlayText

    row = db.query(OverlayText).filter(OverlayText.key == key).first()
    if not row:
        row = OverlayText(key=key)
        db.add(row)

    row.data = data
    row.updated_at = now_rome()
    row.updated_by_id = user_id
    db.commit()
    db.refresh(row)
    return row
