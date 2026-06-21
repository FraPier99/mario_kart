from pydantic import BaseModel


class LeaderBoardResponse(BaseModel):
    id: int
    nickname: str
    total_point: int
