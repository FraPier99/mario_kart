from pydantic import BaseModel,StringConstraints
from typing import Optional,Annotated


NormalizeStr  = Annotated[str,StringConstraints(strip_whitespace=True,to_lower=True)]

class CreateRace(BaseModel):
    
    name : str 
    race_order : int 
    tournament_id : int 
    circuit_id : int 

class RaceResponse(BaseModel): 
    
    id : int 
    #da togliere dopo
    name : str 
    race_order : int 
    tournament_id : int 
    circuit_id : int 
    model_config = {'from_attributes':True }

class UpdateRace(BaseModel): 

    name : Optional[NormalizeStr] = None
    race_order : Optional[int] = None
    tournament_id : Optional[int] = None
    circuit_id : Optional[int] = None









    
