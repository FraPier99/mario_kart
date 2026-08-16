from pydantic import BaseModel, Field, StringConstraints, model_validator
from typing import Optional, Annotated

from app.core.media import to_image_url

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
    requires_pass: bool = False

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _localize_images(self):
        self.image_url = to_image_url(f"/circuits/{self.id}/photo", self.image_url)
        return self


class UpdateCircuit(BaseModel):
    name: Optional[NormalizeStr] = None
    image_url: Optional[str] = None
    requires_pass: Optional[bool] = None

    model_config = {"from_attributes": True}
