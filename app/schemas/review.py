from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    rating: int
    text: Optional[str]
    created_at: datetime
    user_id: int
    username: str = ""

    class Config:
        from_attributes = True
