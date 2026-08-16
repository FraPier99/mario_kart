from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.media import decode_data_url
from app.core.security import require_roles
from app.services.tornei.circuits import get_all_circuits, get_circuit_by_id, update_circuit, create_circuit, delete_circuit
from app.controllers.tornei.schemas.circuits import CircuitResponse, CreateCircuit, UpdateCircuit


router = APIRouter(prefix="/circuits", tags=["Circuits"])


@router.get("", response_model=list[CircuitResponse])
def list_circuits(game_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return get_all_circuits(db, game_id=game_id)


@router.post("", response_model=CircuitResponse, status_code=201)
def insert_circuit(
    payload: CreateCircuit,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    try:
        return create_circuit(db, payload.model_dump())
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esiste già un circuito con questo nome per questo gioco",
        )


@router.get("/{circuit_id}/photo")
def get_circuit_photo(circuit_id: int, db: Session = Depends(get_db)):
    circuit = get_circuit_by_id(db, circuit_id)
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuito non trovato")
    if not circuit.image_url or not circuit.image_url.startswith("data:"):
        raise HTTPException(status_code=404, detail="Immagine non disponibile")
    mime, raw_bytes = decode_data_url(circuit.image_url)
    return Response(
        content=raw_bytes,
        media_type=mime,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.put("/{circuit_id}", response_model=CircuitResponse)
def update_circuit_by_id(
    circuit_id: int,
    payload: UpdateCircuit,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    try:
        updated = update_circuit(db, payload, circuit_id)
        if not updated:
            raise HTTPException(
                status_code=404, detail=f"circuit with id {circuit_id} not found"
            )
        return updated
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esiste già un circuito con questo nome per questo gioco",
        )
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


@router.delete("/{circuit_id}", status_code=204)
def delete_circuit_by_id(
    circuit_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    try:
        deleted = delete_circuit(db, circuit_id)
        if not deleted:
            raise HTTPException(
                status_code=404, detail=f"circuit with id {circuit_id} not found"
            )
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
