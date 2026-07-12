from typing import Optional
from sqlalchemy.orm import Session
from app.models import Circuit
from app.controllers.tornei.schemas.circuits import UpdateCircuit


def get_circuit_by_id(db: Session, circuit_id: int):
    return db.query(Circuit).filter(Circuit.id == int(circuit_id)).first()


def update_circuit(db: Session, circuit_data: UpdateCircuit, circuit_id: int):
    circuit = db.query(Circuit).filter(Circuit.id == circuit_id).first()
    if not circuit:
        return None

    update_data = circuit_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(circuit, key, value)

    db.commit()
    db.refresh(circuit)
    return circuit


def get_all_circuits(db: Session, game_id: Optional[int] = None):
    q = db.query(Circuit)
    if game_id is not None:
        q = q.filter(Circuit.game_id == game_id)
    return q.order_by(Circuit.id).all()


def create_circuit(db: Session, circuit_payload: dict):
    # If a circuit with same (name, game_id) exists, return it to avoid unique constraint errors
    name = circuit_payload.get("name")
    game_id = circuit_payload.get("game_id")

    existing = (
        db.query(Circuit)
        .filter(Circuit.name == name, Circuit.game_id == game_id)
        .first()
    )
    if existing:
        return existing

    # circuit_payload may include explicit 'id' to match frontend static ids
    new_circuit = Circuit(
        id=circuit_payload.get("id"),
        name=name,
        description=circuit_payload.get("description"),
        game_id=game_id,
        image_url=circuit_payload.get("image_url"),
    )
    try:
        db.add(new_circuit)
        db.commit()
        db.refresh(new_circuit)
        return new_circuit
    except Exception:
        db.rollback()
        # If commit failed due to race condition / unique constraint, try to return existing record
        existing = (
            db.query(Circuit)
            .filter(Circuit.name == name, Circuit.game_id == game_id)
            .first()
        )
        if existing:
            return existing
        raise
