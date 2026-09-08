from pydantic import BaseModel


class OverlayTextResponse(BaseModel):
    key: str
    data: dict | None = None


class UploadOverlayTextPayload(BaseModel):
    data: dict
