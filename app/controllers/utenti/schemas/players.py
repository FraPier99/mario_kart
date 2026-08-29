from pydantic import BaseModel, Field, StringConstraints, model_validator

from typing import Optional, Annotated

from app.core.media import to_image_url

#
NormalizeStr = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True)]

# Colore accent personale, usato solo come inline style (avatar ring) —
# vincolato a un hex a 6 cifre per evitare di iniettare valori CSS
# arbitrari nel DOM tramite un campo profilo.
AccentColorStr = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]


class CreatePlayer(BaseModel):
    first_name: NormalizeStr
    last_name: NormalizeStr
    nickname: NormalizeStr = Field(..., min_length=3, max_length=20)
    favorite_character_id: Optional[int] = None
    img_url: Optional[str] = None
    bio: Optional[str] = None
    accent_color: Optional[AccentColorStr] = None


class PlayerResponse(BaseModel):
    id: int
    first_name: NormalizeStr
    last_name: NormalizeStr
    nickname: NormalizeStr
    favorite_character_id: Optional[int] = None
    img_url: Optional[str] = None
    champion_photo: Optional[str] = None
    bio: Optional[str] = None
    accent_color: Optional[str] = None

    # per far capire a pydantic che deve convertire l'istanza del modello SQLAlchemy in un dizionario
    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _localize_images(self):
        # Riscrive i base64 in URL dedicati (vedi app.core.media) — qualunque
        # endpoint che usa PlayerResponse (lista, dettaglio) ne beneficia
        # automaticamente, senza dover toccare i service che lo restituiscono.
        self.img_url = to_image_url(f"/players/{self.id}/avatar", self.img_url)
        self.champion_photo = to_image_url(f"/players/{self.id}/champion-photo-image", self.champion_photo)
        return self


class UpdatePlayer(BaseModel):
    first_name: Optional[NormalizeStr] = None
    last_name: Optional[NormalizeStr] = None
    nickname: Optional[NormalizeStr] = None
    favorite_character_id: Optional[int] = None
    img_url: Optional[str] = None
    bio: Optional[str] = None
    accent_color: Optional[AccentColorStr] = None

    model_config = {"from_attributes": True}
