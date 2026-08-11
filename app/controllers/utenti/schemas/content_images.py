from pydantic import BaseModel


class ContentImageResponse(BaseModel):
    key: str
    image_url: str


class UploadContentImagePayload(BaseModel):
    image_data: str
