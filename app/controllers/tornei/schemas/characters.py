from pydantic import BaseModel, StringConstraints
from typing import Annotated, Optional

NormalizeStr = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True)]


class CreateCharacter(BaseModel):
    name: NormalizeStr
    img_url: Optional[str] = None
    game_id: int

    model_config = {"from_attributes": True}


class CharacterResponse(BaseModel):
    id: int
    name: NormalizeStr
    description: Optional[NormalizeStr] = None
    img_url: Optional[str] = None
    game_id: int

    model_config = {"from_attributes": True}


class UpdateCharacter(BaseModel):
    name: Optional[NormalizeStr] = None
    img_url: Optional[str] = None

    model_config = {"from_attributes": True}
