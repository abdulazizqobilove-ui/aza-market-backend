from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole = UserRole.buyer


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: Optional[str] = None
    username: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    balance: float = 0.0
    avatar_url: Optional[str] = None
    created_at: datetime
    shop_name: Optional[str] = None
    shop_description: Optional[str] = None
    shop_banner_url: Optional[str] = None
    shop_logo_url: Optional[str] = None

    class Config:
        from_attributes = True


class ShopOut(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    shop_name: Optional[str] = None
    shop_description: Optional[str] = None
    shop_banner_url: Optional[str] = None
    shop_logo_url: Optional[str] = None
    created_at: datetime
    rating: Optional[float] = None
    reviews_count: Optional[int] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
