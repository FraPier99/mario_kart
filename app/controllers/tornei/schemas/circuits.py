from pydantic import BaseModel, Field, StringConstraints
from typing import Optional, Annotated

NormalizeStr = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True)]


class CreateCircuit(BaseModel):
    name: NormalizeStr
    description: NormalizeStr


class CircuitResponse(BaseModel):
    id: int
    name: NormalizeStr
    description: NormalizeStr
    game_id: int
    image_url: Optional[str] = None

    model_config = {"from_attributes": True}
