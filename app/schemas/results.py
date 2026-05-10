from pydantic import BaseModel,Field,StringConstraints
from typing import Optional


class CreateResult(BaseModel) : 
    race_id : int 
    player_id : int
    character_id : int 
    position : int


class ResultResponse(BaseModel): 
    id : int 
    race_id : int 
    player_id : int 
    character_id : int 
    position :  int  = Field(...,gt=0)
    points : int 

    model_config = {'from_attributes':True}

class UpdateResult(BaseModel):
    position: Optional[int] = Field(default=None, gt=0)
    character_id: Optional[int] = None
