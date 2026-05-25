from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    rating: int
    text: Optional[str] = None
    images: List[str] = []
    created_at: datetime
    user_id: int
    username: str = ""

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        result = super().model_validate(obj, *args, **kwargs)
        if result.images is None:
            result.images = []
        return result

    class Config:
        from_attributes = True
