from sqlalchemy.orm import Session
from app.models import Race
from app.controllers.tornei.schemas.races import CreateRace, UpdateRace
from app.data.punteggi import PUNTEGGI_CONFIG


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


def reorder_race_results(db: Session, race_id: int, assignments: list[dict]):
    """Riassegna posizione e personaggio di più risultati della STESSA gara in
    un'unica transazione (un solo commit finale, non uno per riga).

    Necessario perché il vincolo unique_position_per_race è DEFERRABLE
    INITIALLY DEFERRED (vedi bootstrap.py): riordinando via singole PUT
    /results/{id} indipendenti — ciascuna la propria transazione — uno
    scambio di posizione (es. 1° <-> 2°) fa quasi sempre collidere
    temporaneamente la nuova posizione di un risultato con quella non ancora
    aggiornata di un altro, perché il vincolo differito si applica solo
    all'interno di una singola transazione, non tra richieste separate.
    Facendo tutti gli UPDATE qui e un solo commit alla fine, lo stato
    intermedio (non ancora valido) non viene mai controllato.

    assignments: [{"result_id": int, "position": int, "character_id": int}, ...]
    """
    race = db.query(Race).filter(Race.id == race_id).first()
    if not race or not race.tournament:
        return None

    total_player = race.tournament.n_players
    results_by_id = {r.id: r for r in race.results}

    updated = []
    for item in assignments:
        result = results_by_id.get(item["result_id"])
        if not result:
            raise ValueError("Result not found for this race")

        result.position = item["position"]
        result.character_id = item["character_id"]
        try:
            result.points = PUNTEGGI_CONFIG[total_player][result.position - 1]
        except KeyError:
            raise ValueError("Invalid Tournament Size")
        except IndexError:
            raise ValueError("Invalid Position")
        updated.append(result)

    db.commit()
    for result in updated:
        db.refresh(result)

    return updated
