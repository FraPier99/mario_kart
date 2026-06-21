from sqlalchemy.orm import Session
from app.models import Race
from app.controllers.tornei.schemas.races import CreateRace, UpdateRace


def get_races(db: Session):
    return db.query(Race).all()


def create_race(db: Session, race_data: CreateRace):

    if race_data.is_duello and race_data.group_name:
        from app.services.tornei.tournaments import (
            get_classic_podium_ties,
            get_finals_podium_ties,
            DUELLO_PODIO_1_2,
            DUELLO_PODIO_3_4,
        )

        if race_data.group_name.startswith("duello_podio_"):
            ties = get_classic_podium_ties(db, race_data.tournament_id)
            block = None
            if race_data.group_name == DUELLO_PODIO_1_2:
                block = ties.get("top2")
            elif race_data.group_name == DUELLO_PODIO_3_4:
                block = ties.get("top4")
            else:
                block = next(
                    (
                        b
                        for b in ties.get("others", [])
                        if b.get("group_name") == race_data.group_name
                    ),
                    None,
                )
            if block and block.get("order") is not None:
                raise ValueError(f"Duello già risolto per {race_data.group_name}")
        elif race_data.phase == "finals" and race_data.group_name.startswith(
            "finals_duello_podio_"
        ):
            ties = get_finals_podium_ties(db, race_data.tournament_id)
            block = ties.get("top2") or ties.get("top4")
            if block and block.get("order") is not None:
                raise ValueError(f"Duello già risolto per {race_data.group_name}")

    new_race = Race(**race_data.model_dump())
    db.add(new_race)
    db.commit()
    db.refresh(new_race)

    return new_race


def delete_race(db: Session, race_id: int):

    race = db.query(Race).filter(Race.id == race_id).first()

    if not race:
        return None
    db.delete(race)
    db.commit()
    return race


def get_race(db: Session, race_id: int):

    race = db.query(Race).filter(Race.id == race_id).first()

    if not race:
        return None

    return race


def update_race(db: Session, raceData: UpdateRace, race_id: int):

    race = db.query(Race).filter(Race.id == race_id).first()

    if not race:
        return None

    update_race = raceData.model_dump(exclude_unset=True)

    for key, value in update_race.items():
        setattr(race, key, value)

    db.commit()
    db.refresh(race)

    return race
