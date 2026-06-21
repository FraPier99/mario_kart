from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.services.tornei.circuits import get_all_circuits
from app.controllers.tornei.schemas.circuits import CircuitResponse


router = APIRouter(prefix="/circuits", tags=["Circuits"])


@router.get("", response_model=list[CircuitResponse])
def list_circuits(game_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return get_all_circuits(db, game_id=game_id)
