from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel


CardType = Literal["master", "blue_shell"]


class UserInventoryResponse(BaseModel):
    id: int
    user_id: int
    card_type: CardType
    card_name: str
    description: str
    source_tournament_id: Optional[int] = None
    source_tournament_name: Optional[str] = None
    source_game_name: Optional[str] = None
    source_schedina_id: Optional[int] = None
    is_consumed: bool
    consumed_in_race_id: Optional[int] = None
    consumed_in_phase: Optional[str] = None
    consumed_in_group_name: Optional[str] = None
    consumed_effect: Optional[str] = None
    created_at: datetime
    consumed_at: Optional[datetime] = None
    game_id: Optional[int] = None
    granted_by_admin: bool = False
    admin_note: Optional[str] = None
    granted_by_user_id: Optional[int] = None
    granted_by_username: Optional[str] = None
    user_nickname: Optional[str] = None
    user_img_url: Optional[str] = None

    model_config = {"from_attributes": True}
