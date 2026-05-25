from pydantic import BaseModel
from app.schemas.product import ProductListOut


class CartItemAdd(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemOut(BaseModel):
    id: int
    quantity: int
    product: ProductListOut

    class Config:
        from_attributes = True
