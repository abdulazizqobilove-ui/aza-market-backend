from pydantic import BaseModel
from typing import Optional
from app.schemas.product import ProductListOut


class CartItemAdd(BaseModel):
    product_id: int
    quantity: int = 1
    selected_attrs: Optional[dict] = None


class CartItemOut(BaseModel):
    id: int
    quantity: int
    product: ProductListOut
    selected_attrs: Optional[dict] = None

    class Config:
        from_attributes = True
