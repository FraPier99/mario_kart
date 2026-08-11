from datetime import datetime

from pydantic import BaseModel, Field


class CreatePointAdjustment(BaseModel):
    tournament_id: int
    player_id: int
    points: int = Field(..., description="Positivo per bonus, negativo per penalità; non può essere 0")
    reason: str = Field(..., min_length=1, description="Motivo, sempre obbligatorio e visibile pubblicamente")


class PointAdjustmentResponse(BaseModel):
    id: int
    tournament_id: int
    player_id: int
    player_nickname: str
    points: int
    reason: str
    created_by_user_id: int
    created_by_username: str
    created_at: datetime

    model_config = {"from_attributes": True}
