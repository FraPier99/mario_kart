from pydantic import BaseModel,Field,StringConstraints
from typing import Optional,Annotated

NormalizeStr = Annotated[str,StringConstraints(strip_whitespace=True,to_lower=True)]


class LeaderBoardResponse: 
    player_id: int 
    nickname : NormalizeStr
    total_points : int