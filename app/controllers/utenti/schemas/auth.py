from typing import Optional, Literal, Annotated

from pydantic import BaseModel, Field, StringConstraints


NormalizeStr = Annotated[str, StringConstraints(strip_whitespace=True)]
UserRole = Literal["superadmin", "admin", "user"]


class LoginRequest(BaseModel):
    username: NormalizeStr
    password: str


class AuthPlayerSummary(BaseModel):
    id: int
    first_name: str
    last_name: str
    nickname: str
    favorite_character_id: Optional[int] = None
    img_url: Optional[str] = None

    model_config = {"from_attributes": True}


class UserBase(BaseModel):
    username: Optional[NormalizeStr] = None
    role: UserRole = "user"
    player_id: Optional[int] = None
    is_active: bool = True


class CreateUser(UserBase):
    password: str = Field(..., min_length=6)


class UpdateUser(BaseModel):
    username: Optional[NormalizeStr] = None
    password: Optional[str] = Field(default=None, min_length=6)
    role: Optional[UserRole] = None
    player_id: Optional[int] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    username: NormalizeStr
    role: UserRole
    is_active: bool
    virtual_coins: int = 100
    must_change_password: bool = True
    img_url: Optional[str] = None
    player_id: Optional[int] = None
    player: Optional[AuthPlayerSummary] = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UpdateMyProfile(BaseModel):
    first_name: Optional[NormalizeStr] = None
    last_name: Optional[NormalizeStr] = None
    nickname: Optional[NormalizeStr] = None
    favorite_character_id: Optional[int] = None
    img_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = None
    new_password: str = Field(..., min_length=6)
    force: bool = False
