from sqlalchemy.orm import Session
from model import Circuit


def get_circuit_by_id(db: Session, circuit_id: int):
    return db.query(Circuit).filter(Circuit.id == int(circuit_id)).first()


def get_all_circuits(db: Session):
    return db.query(Circuit).all()


def create_circuit(db: Session, circuit_payload: dict):
    # If a circuit with same (name, game_id) exists, return it to avoid unique constraint errors
    name = circuit_payload.get('name')
    game_id = circuit_payload.get('game_id')

    existing = db.query(Circuit).filter(Circuit.name == name, Circuit.game_id == game_id).first()
    if existing:
        return existing

    # circuit_payload may include explicit 'id' to match frontend static ids
    new_circuit = Circuit(
        id=circuit_payload.get('id'),
        name=name,
        description=circuit_payload.get('description'),
        game_id=game_id,
    )
    try:
        db.add(new_circuit)
        db.commit()
        db.refresh(new_circuit)
        return new_circuit
    except Exception:
        db.rollback()
        # If commit failed due to race condition / unique constraint, try to return existing record
        existing = db.query(Circuit).filter(Circuit.name == name, Circuit.game_id == game_id).first()
        if existing:
            return existing
        raise
