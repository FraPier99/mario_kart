from app.core.db import SessionLocal
from app.data.circuits import all_circuits
from app.models import Circuit


# $env:PYTHONPATH="app"; python app/Scripts/circuits.py
def populate_circuits(circuits_data: list[dict]):

    db = SessionLocal()

    # ** = unpacking operator per convertire ogni dizionario in un oggetto Circuit
    circuits = [Circuit(**c) for c in circuits_data]
    #
    try:
        db.add_all(circuits)

        db.commit()

    except Exception as e:
        db.rollback()
    finally:
        db.close()


populate_circuits(all_circuits)
