from pydantic import BaseModel,Field,StringConstraints

from typing import Optional,Annotated

#
NormalizeStr  = Annotated[str,StringConstraints(strip_whitespace=True,to_lower=True)]
class CreatePlayer(BaseModel):
    first_name :  NormalizeStr
    last_name  :  NormalizeStr
    nickname:   NormalizeStr = Field(...,min_length=3, max_length=20)
    favorite_character_id :   Optional[int] = None

class PlayerResponse(BaseModel): 
    id: int 
    first_name: NormalizeStr 
    last_name: NormalizeStr
    nickname:  NormalizeStr
    favorite_character_id : Optional[int] = None

    #per far capire a pydantic che deve convertire l'istanza del modello SQLAlchemy in un dizionario
    model_config = {"from_attributes": True}
        
class UpdatePlayer(BaseModel):
    first_name: Optional[NormalizeStr] = None
    last_name: Optional[NormalizeStr] = None
    nickname: Optional[NormalizeStr] = None
    favorite_character_id: Optional[int] = None

    model_config = {"from_attributes": True}