from pydantic import BaseModel


class UpdateOwnershipRequest(BaseModel):
    games: dict[int, int] = {}
    consoles: dict[str, int] = {}
    r4_devices: dict[str, int] = {}
