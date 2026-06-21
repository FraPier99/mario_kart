"""
Popola il DB con i dati di Mario Kart 8 Deluxe (game_id dinamico).

Uso:
    $env:PYTHONPATH = "."
    python app/Scripts/seed_mk8deluxe.py
"""

from sqlalchemy.exc import IntegrityError

from app.core.db import SessionLocal
from app.data.mk8deluxe import (
    MK8D_GAME_NAME,
    MK8D_GAME_DESCRIPTION,
    MK8D_CHARACTERS,
    MK8D_CIRCUITS,
)
from app.models import Game, Character, Circuit


def get_or_create_game(db) -> Game:
    game = db.query(Game).filter(Game.name == MK8D_GAME_NAME).first()
    if game:
        print(f"[GAME] già presente — id={game.id}, name='{game.name}'")
        return game
    game = Game(name=MK8D_GAME_NAME, description=MK8D_GAME_DESCRIPTION)
    db.add(game)
    db.commit()
    db.refresh(game)
    print(f"[GAME] creato — id={game.id}, name='{game.name}'")
    return game


def seed_characters(db, game_id: int) -> None:
    inserted = 0
    updated = 0
    valid_names = {data["name"] for data in MK8D_CHARACTERS}

    # Rimuovi personaggi non più validi (es. Spike inserito per errore)
    stale = (
        db.query(Character)
        .filter(Character.game_id == game_id, ~Character.name.in_(valid_names))
        .all()
    )
    for ch in stale:
        db.delete(ch)
    if stale:
        db.commit()
        print(f"[CHARACTERS] rimossi {len(stale)} personaggi non validi: {[c.name for c in stale]}")

    for data in MK8D_CHARACTERS:
        exists = (
            db.query(Character)
            .filter(Character.name == data["name"], Character.game_id == game_id)
            .first()
        )
        if exists:
            exists.img_url = data.get("img_url")
            exists.description = data["description"]
            updated += 1
        else:
            db.add(Character(
                name=data["name"],
                description=data["description"],
                img_url=data.get("img_url"),
                game_id=game_id,
            ))
            inserted += 1
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        print(f"[CHARACTERS] IntegrityError durante il commit: {e}")
        return
    print(f"[CHARACTERS] inseriti={inserted}  aggiornati={updated}")


def seed_circuits(db, game_id: int) -> None:
    inserted = 0
    skipped = 0
    for data in MK8D_CIRCUITS:
        exists = (
            db.query(Circuit)
            .filter(Circuit.name == data["name"], Circuit.game_id == game_id)
            .first()
        )
        if exists:
            skipped += 1
            continue
        db.add(Circuit(
            name=data["name"],
            description=data["description"],
            image_url=data.get("image_url"),
            game_id=game_id,
        ))
        inserted += 1
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        print(f"[CIRCUITS] IntegrityError durante il commit: {e}")
        return
    print(f"[CIRCUITS] inseriti={inserted}  già presenti={skipped}")


def main():
    db = SessionLocal()
    try:
        game = get_or_create_game(db)
        seed_characters(db, game.id)
        seed_circuits(db, game.id)
        print("[DONE] seed MK8 Deluxe completato.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
