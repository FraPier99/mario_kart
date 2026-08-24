from typing import Optional, Annotated

from pydantic import BaseModel, StringConstraints

# key è uno slug stabile: minuscolo, senza spazi (referenziato come stringa
# grezza da UserConsoleOwnership.console_key/UserR4Device.device_type).
ConsoleKey = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=1)]
ConsoleLabel = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class CreateConsole(BaseModel):
    key: ConsoleKey
    label: ConsoleLabel
    is_r4_compatible: bool = False


class UpdateConsole(BaseModel):
    # key è immutabile dopo la creazione: cambiarla orfanizzerebbe le righe
    # di possesso esistenti che referenziano la vecchia chiave.
    label: Optional[ConsoleLabel] = None
    is_r4_compatible: Optional[bool] = None

    model_config = {"from_attributes": True}


class ConsoleResponse(BaseModel):
    id: int
    key: str
    label: str
    is_r4_compatible: bool
    sort_order: int

    model_config = {"from_attributes": True}
