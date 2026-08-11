from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import require_roles
from app.services.tornei.circuits import create_circuit, get_circuit_by_id
from app.services.tornei.races import (
    create_race,
    delete_race,
    get_race,
    get_races,
    reorder_race_results,
    update_race,
)
from app.services.tornei.tournaments import get_tournament
from app.data.circuits import all_circuits as SERVER_CIRCUITS
from app.models import Race
from app.controllers.tornei.schemas.races import CreateRace, RaceResponse, ReorderResults, UpdateRace
from app.controllers.tornei.schemas.results import ResultResponse


router = APIRouter(prefix="/races", tags=["Races"])


@router.get("", response_model=list[RaceResponse])
def all_races(db: Session = Depends(get_db)):
    return get_races(db)


@router.get("/{race_id}", response_model=RaceResponse)
def get_race_by_id(race_id: int, db: Session = Depends(get_db)):
    race = get_race(db, race_id)

    if not race:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Race with id {race_id} not found",
        )

    return race


@router.delete("/{race_id}")
def delete_race_by_id(
    race_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    deleted_race = delete_race(db, race_id)

    if not deleted_race:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="race not found"
        )

    return {"message": "Race deleted successfully"}


@router.post("", response_model=RaceResponse, status_code=201)
def insert_race(
    raceData: CreateRace,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    try:
        tournament = get_tournament(db, raceData.tournament_id)
        if not tournament:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tournament with id {raceData.tournament_id} not found",
            )

        if tournament.status == "da_svolgere":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Il torneo è 'In Attesa': avvia il torneo (stato 'In Corso') prima di inserire gare.",
            )

        if tournament.status == "concluso":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Il torneo è concluso: non è più possibile aggiungere gare.",
            )

        # I circuiti usati sono tracciati separatamente per fase/girone: lo stesso
        # circuito può essere riutilizzato in gironi diversi, e ogni nuova fase
        # (semifinali, finale) riparte con un pool di circuiti vuoto.
        existing_race = (
            db.query(Race)
            .filter(
                Race.tournament_id == raceData.tournament_id,
                Race.circuit_id == raceData.circuit_id,
                Race.phase.is_(raceData.phase)
                if raceData.phase is None
                else Race.phase == raceData.phase,
                Race.group_name.is_(raceData.group_name)
                if raceData.group_name is None
                else Race.group_name == raceData.group_name,
            )
            .first()
        )
        if existing_race:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Circuito già usato in questa fase del torneo",
            )

        # Per le gare di duello (spareggio podio), controlliamo che il circuito
        # non sia già stato usato in NESSUNA gara del torneo, regolare o duello.
        if raceData.is_duello:
            duello_conflict = (
                db.query(Race)
                .filter(
                    Race.tournament_id == raceData.tournament_id,
                    Race.circuit_id == raceData.circuit_id,
                )
                .first()
            )
            if duello_conflict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Circuito già utilizzato in una gara precedente del torneo — i duelli non possono riutilizzare piste già corse",
                )

        circuit = get_circuit_by_id(db, raceData.circuit_id)
        if not circuit:
            idx = int(raceData.circuit_id) - 1
            if 0 <= idx < len(SERVER_CIRCUITS):
                spec = SERVER_CIRCUITS[idx]
                create_circuit(
                    db,
                    {
                        "id": int(raceData.circuit_id),
                        "name": spec.get("name"),
                        "description": spec.get("description"),
                        "game_id": tournament.game_id,
                        "image_url": spec.get("image_url"),
                    },
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Circuit with id {raceData.circuit_id} not found and cannot be inferred",
                )

        circuit = get_circuit_by_id(db, raceData.circuit_id)
        if not circuit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Circuit with id {raceData.circuit_id} not found",
            )
        if circuit.game_id != tournament.game_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Circuit '{circuit.name}' does not belong to game '{tournament.game.name}'",
            )

        return create_race(db, raceData)
    except IntegrityError as e:
        db.rollback()
        detail_msg = str(e.orig) if getattr(e, "orig", None) else str(e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database integrity error: {detail_msg}",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid numeric value: {str(e)}",
        )


@router.put("/{race_id}", response_model=RaceResponse)
def update_race_by_id(
    race_id: int,
    raceData: UpdateRace,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    try:
        race = update_race(db, raceData, race_id)

        if not race:
            raise HTTPException(status_code=404, detail="Race not found")

        return race
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid data or related entities not found",
        )


@router.put("/{race_id}/results/reorder", response_model=list[ResultResponse])
def reorder_race_results_by_id(
    race_id: int,
    payload: ReorderResults,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    try:
        results = reorder_race_results(
            db, race_id, [item.model_dump() for item in payload.results]
        )

        if results is None:
            raise HTTPException(status_code=404, detail="Race not found")

        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid data")
