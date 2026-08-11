from sqlalchemy.orm import Session

from app.core.timezone import now_rome


def list_content_images(db: Session) -> list:
    from app.models import SiteContentImage

    return (
        db.query(SiteContentImage)
        .filter(SiteContentImage.image_data.isnot(None))
        .order_by(SiteContentImage.key.asc())
        .all()
    )


def get_content_image(db: Session, key: str):
    from app.models import SiteContentImage

    return db.query(SiteContentImage).filter(SiteContentImage.key == key).first()


def upsert_content_image(db: Session, key: str, image_data: str, user_id: int):
    from app.core.image_optim import optimize_image_data_url
    from app.models import SiteContentImage

    row = db.query(SiteContentImage).filter(SiteContentImage.key == key).first()
    if not row:
        row = SiteContentImage(key=key)
        db.add(row)

    # Foto di contenuto (es. copertina "La Lega"): stesso trattamento della
    # foto campione, dimensione un po' più generosa perché spesso a piena
    # larghezza in pagina.
    row.image_data = optimize_image_data_url(image_data, max_dimension=1400)
    row.updated_at = now_rome()
    row.updated_by_id = user_id
    db.commit()
    db.refresh(row)
    return row
