from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    parent_id: Optional[int]

    class Config:
        from_attributes = True


class ProductImageOut(BaseModel):
    id: int
    url: str
    is_main: bool

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    stock: int = 0
    brand: Optional[str] = None
    category_id: int


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    stock: Optional[int] = None
    brand: Optional[str] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    price: float
    original_price: Optional[float]
    stock: int
    brand: Optional[str]
    rating: float
    reviews_count: int
    is_active: bool
    created_at: datetime
    seller_id: int
    category: CategoryOut
    images: List[ProductImageOut] = []

    class Config:
        from_attributes = True


class ProductListOut(BaseModel):
    id: int
    title: str
    price: float
    original_price: Optional[float]
    stock: int
    brand: Optional[str]
    rating: float
    reviews_count: int
    is_active: bool
    seller_id: int
    category: CategoryOut
    images: List[ProductImageOut] = []

    class Config:
        from_attributes = True
