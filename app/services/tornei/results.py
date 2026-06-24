from sqlalchemy.orm import Session
from app.models import Race, Result
from app.controllers.tornei.schemas.results import CreateResult, UpdateResult
from sqlalchemy.exc import IntegrityError
from app.data.punteggi import PUNTEGGI_CONFIG


def get_results(db: Session):
    return db.query(Result).all()


def get_result(db: Session, result_id: int):

    result = db.query(Result).filter(Result.id == result_id).first()

    if not result:
        return None

    return result


def create_result(db: Session, resultData: CreateResult):

    # cerco la gara a cui voglio aggiungere il risultato
    race = db.query(Race).filter(Race.id == resultData.race_id).first()

    # se la gara non esiste ritorno None
    if not race:
        return None

    # prendo il torneo a cui appartiene la gara
    tournament = race.tournament
    # prendo il numero totale di giocatori del torneo
    total_player = tournament.n_players

    try:
        # calcolo i punti in base alla posizione del risultato e al numero totale di giocatori del torneo
        points = PUNTEGGI_CONFIG[total_player][resultData.position - 1]
    except KeyError:
        raise ValueError("Invalid Tournament Size")
    except IndexError:
        raise ValueError("Invalid Position")

    new_result = Result(**resultData.model_dump(), points=points)

    db.add(new_result)
    db.commit()
    db.refresh(new_result)

    return new_result


def delete_result(db: Session, result_id: int):
    result = db.query(Result).filter(Result.id == result_id).first()
    if not result:
        return None
    db.delete(result)
    db.commit()
    return result


def update_result(db: Session, resultData: UpdateResult, result_id: int):

    result = db.query(Result).filter(Result.id == result_id).first()

    if not result:
        return None

    race = result.race

    update_data = resultData.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(result, key, value)

    if "position" in update_data:
        if not race or not race.tournament:
            raise ValueError("Invalid Race")

        total_player = race.tournament.n_players

        try:
            result.points = PUNTEGGI_CONFIG[total_player][result.position - 1]
        except KeyError:
            raise ValueError("Invalid Tournament Size")
        except IndexError:
            raise ValueError("Invalid Position")

    db.commit()
    db.refresh(result)

    return result
