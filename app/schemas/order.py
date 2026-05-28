from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models.order import OrderStatus
from app.schemas.product import ProductListOut


class OrderItemOut(BaseModel):
    id: int
    product: ProductListOut
    quantity: int
    price: float

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    delivery_address: str
    delivery_city: str
    contact_phone: str
    payment_method: str = "cash"
    delivery_date: Optional[str] = None
    delivery_time: Optional[str] = None
    item_ids: Optional[List[int]] = None


class OrderOut(BaseModel):
    id: int
    status: OrderStatus
    total_price: float
    delivery_address: str
    delivery_city: str
    contact_phone: str
    payment_method: str = "cash"
    delivery_date: Optional[str] = None
    delivery_time: Optional[str] = None
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
