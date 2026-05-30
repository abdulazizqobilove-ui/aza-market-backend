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


class PaymentShortOut(BaseModel):
    id: int
    method: str
    status: str
    amount: float
    currency: str

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    status: OrderStatus
    total_price: float
    delivery_address: str
    delivery_city: str
    contact_phone: str
    payment_method: str = "cash"
    is_paid: bool = False
    delivery_cost: float = 0.0
    delivery_date: Optional[str] = None
    delivery_time: Optional[str] = None
    delivery_service: Optional[str] = None
    tracking_number: Optional[str] = None
    created_at: datetime
    items: List[OrderItemOut] = []
    payment: Optional[PaymentShortOut] = None

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderTrackingUpdate(BaseModel):
    delivery_service: str          # sesamt | apost | other
    tracking_number: Optional[str] = None
