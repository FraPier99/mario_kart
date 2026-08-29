from typing import Optional, Literal, Annotated

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.core.media import to_image_url


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
    bio: Optional[str] = None
    accent_color: Optional[str] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _localize_avatar(self):
        # Stesso fix di PlayerResponse (app.controllers.utenti.schemas.players)
        # — schema diverso, stesso bug: senza questo, /auth/users e
        # /auth/community/users incorporano l'avatar in base64 crudo per
        # ogni utente nella lista invece di un URL cacheabile.
        self.img_url = to_image_url(f"/players/{self.id}/avatar", self.img_url)
        return self


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
    bio: Optional[str] = None
    accent_color: Optional[Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]] = None


class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = None
    new_password: str = Field(..., min_length=6)
    force: bool = False
