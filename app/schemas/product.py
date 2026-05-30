from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    parent_id: Optional[int]
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class ProductImageOut(BaseModel):
    id: int
    url: str
    is_main: bool
    variant_index: Optional[int] = None

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    title: str
    description: Optional[str] = None
    about: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    stock: int = 0
    brand: Optional[str] = None
    category_id: int
    sku: Optional[str] = None
    attributes: Optional[dict] = None
    variants: Optional[List[dict]] = None
    shop_tag: Optional[str] = None
    delivery_price: float = 0.0
    delivery_price_other: float = 0.0
    delivery_mode: str = "service"


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    about: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    stock: Optional[int] = None
    brand: Optional[str] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None
    sku: Optional[str] = None
    attributes: Optional[dict] = None
    variants: Optional[List[dict]] = None
    shop_tag: Optional[str] = None
    delivery_price: Optional[float] = None
    delivery_price_other: Optional[float] = None
    delivery_mode: Optional[str] = None


class ProductOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    price: float
    original_price: Optional[float]
    stock: int
    brand: Optional[str]
    sku: Optional[str] = None
    rating: float
    reviews_count: int
    sales_count: int = 0
    is_active: bool
    created_at: datetime
    seller_id: int
    category: CategoryOut
    images: List[ProductImageOut] = []
    attributes: Optional[dict] = None
    about: Optional[str] = None
    variants: Optional[List[dict]] = None
    shop_tag: Optional[str] = None
    delivery_price: float = 0.0
    delivery_price_other: float = 0.0
    delivery_mode: str = "service"
    seller_city: Optional[str] = None

    class Config:
        from_attributes = True


class ProductListOut(BaseModel):
    id: int
    title: str
    price: float
    original_price: Optional[float]
    stock: int
    brand: Optional[str]
    sku: Optional[str] = None
    rating: float
    reviews_count: int
    sales_count: int = 0
    is_active: bool
    seller_id: int
    category: CategoryOut
    images: List[ProductImageOut] = []
    attributes: Optional[dict] = None
    variants: Optional[List[dict]] = None
    shop_tag: Optional[str] = None
    delivery_price: float = 0.0
    delivery_price_other: float = 0.0
    delivery_mode: str = "service"
    seller_city: Optional[str] = None

    class Config:
        from_attributes = True


class WaitlistItemOut(BaseModel):
    id: int
    product_id: int
    product: ProductListOut

    class Config:
        from_attributes = True
