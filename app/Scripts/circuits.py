from db.db import SessionLocal
from sqlalchemy.orm import Session
from data.circuits import all_circuits
from model import Circuit
from schemas.circuits import CreateCircuit
from fastapi import Depends 

# $env:PYTHONPATH="app"; python app/Scripts/circuits.py
def populate_circuits(circuits_data: list[dict]):
   
    db = SessionLocal()

      #** = unpacking operator per convertire ogni dizionario in un oggetto Circuit  
    circuits = [Circuit(**c) for c in circuits_data]
    #    
    try: 

        db.add_all(circuits)

        db.commit()

    except Exception as e: 
        db.rollback()
        print(f"Error populating circuits: {e}")
    finally:
        db.close()
    
    print(f"Circuits populated successfully.")

populate_circuits(all_circuits)


    





    




