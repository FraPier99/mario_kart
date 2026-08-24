from sqlalchemy.orm import Session

from app.controllers.utenti.schemas.consoles import CreateConsole, UpdateConsole


def get_all_consoles(db: Session):
    from app.models import Console

    return db.query(Console).order_by(Console.sort_order.asc(), Console.id.asc()).all()


def create_console(db: Session, data: CreateConsole):
    from app.models import Console

    console = Console(**data.model_dump())
    db.add(console)
    db.commit()
    db.refresh(console)
    return console


def update_console(db: Session, console_id: int, data: UpdateConsole):
    from app.models import Console

    console = db.query(Console).filter(Console.id == console_id).first()
    if not console:
        return None

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(console, key, value)

    db.commit()
    db.refresh(console)
    return console


def delete_console(db: Session, console_id: int):
    from app.models import Console

    console = db.query(Console).filter(Console.id == console_id).first()
    if not console:
        return None

    db.delete(console)
    db.commit()
    return console
