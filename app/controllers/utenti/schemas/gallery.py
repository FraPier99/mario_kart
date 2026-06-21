from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PhotoCommentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)


class PhotoCommentUpdate(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)


class PhotoCommentResponse(BaseModel):
    id: int
    photo_id: int
    user_id: int
    username: str
    nickname: Optional[str] = None
    img_url: Optional[str] = None
    user_img_url: Optional[str] = None
    favorite_character_img_url: Optional[str] = None
    text: str
    created_at: datetime
    edited_by_username: Optional[str] = None
    edited_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TournamentPhotoCreate(BaseModel):
    tournament_id: Optional[int] = None
    image_data: str = Field(..., min_length=10)
    caption: Optional[str] = Field(None, max_length=300)


class TournamentPhotoResponse(BaseModel):
    id: int
    tournament_id: Optional[int] = None
    tournament_name: Optional[str] = None
    uploaded_by_user_id: int
    uploaded_by_username: str
    image_data: str
    caption: Optional[str] = None
    created_at: datetime
    comments: list[PhotoCommentResponse] = []

    model_config = {"from_attributes": True}
