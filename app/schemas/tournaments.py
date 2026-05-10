from pydantic import BaseModel,Field,StringConstraints
from typing import Annotated,Optional
from datetime import date


NormalizeStr = Annotated[str,StringConstraints(strip_whitespace=True,to_lower=True)]


class CreateTournament(BaseModel): 
    name  : NormalizeStr
    n_players: int  = Field(..., gt=0, description="Number of players must be greater than 0")
    date : date
    game_id : int 
    winner_id : Optional[int]  = None

class TournamentResponse(BaseModel): 
    id : int 
    name : NormalizeStr
    n_players : int 
    n_races : int
    date : date
    game_id : int 
    winner_id : Optional[int] = None 

    model_config = {'from_attributes':True}

class UpdateTournament(BaseModel): 
    name : Optional[NormalizeStr] = None 
    n_races : Optional[int] = None
    date : Optional[date] = None 
    game_id : Optional[int] = None
    winner_id : Optional[int] = None




    