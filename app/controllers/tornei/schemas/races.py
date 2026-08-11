from pydantic import BaseModel, StringConstraints
from typing import Optional, Annotated, Literal


NormalizeStr = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True)]

# Fase della gara nel torneo a gironi
#   "group"     → Fase 1 (gironi, group_name = "1","2",…)
#   "semifinal" → Fase 2 eventuale (batterie, group_name = "S1","S2",…)
#   "finals"    → Fase finale (group_name = "top" Final 4 | "bottom" Consolazione)
RacePhase = Literal["group", "semifinal", "finals"]


class CreateRace(BaseModel):
    name: str
    race_order: int
    tournament_id: int
    circuit_id: int
    # Campi opzionali: presenti solo nella modalità deluxe_groups
    phase: Optional[RacePhase] = None
    group_name: Optional[str] = None
    # Gara secca di Duello/spareggio: esclusa da statistiche e classifiche
    is_duello: bool = False


class RaceResponse(BaseModel):
    id: int
    name: str
    race_order: int
    tournament_id: int
    circuit_id: int
    phase: Optional[str] = None
    group_name: Optional[str] = None
    is_duello: bool = False

    model_config = {"from_attributes": True}


class UpdateRace(BaseModel):
    name: Optional[NormalizeStr] = None
    race_order: Optional[int] = None
    tournament_id: Optional[int] = None
    circuit_id: Optional[int] = None
    phase: Optional[str] = None
    group_name: Optional[str] = None
    is_duello: Optional[bool] = None


class ReorderResultItem(BaseModel):
    result_id: int
    position: int
    character_id: int


class ReorderResults(BaseModel):
    results: list[ReorderResultItem]
