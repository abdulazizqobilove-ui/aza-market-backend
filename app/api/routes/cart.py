from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import CartItemAdd, CartItemOut

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=List[CartItemOut])
def get_cart(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(CartItem).options(
        joinedload(CartItem.product).joinedload(Product.category),
        joinedload(CartItem.product).joinedload(Product.images),
    ).filter(CartItem.user_id == user.id).all()


@router.post("", response_model=CartItemOut, status_code=201)
def add_to_cart(data: CartItemAdd, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == data.product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock < data.quantity:
        raise HTTPException(status_code=400, detail="Not enough stock")

    # Match by product + selected_attrs so different variants are separate items
    existing = db.query(CartItem).filter(CartItem.user_id == user.id, CartItem.product_id == data.product_id).all()
    item = next((e for e in existing if e.selected_attrs == (data.selected_attrs or None)), None)
    if item:
        item.quantity += data.quantity
    else:
        item = CartItem(user_id=user.id, product_id=data.product_id, quantity=data.quantity, selected_attrs=data.selected_attrs or None)
        db.add(item)
    db.commit()
    db.refresh(item)

    return db.query(CartItem).options(
        joinedload(CartItem.product).joinedload(Product.category),
        joinedload(CartItem.product).joinedload(Product.images),
    ).filter(CartItem.id == item.id).first()


@router.patch("/{item_id}", response_model=CartItemOut)
def update_cart_item(
    item_id: int,
    quantity: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    if quantity <= 0:
        db.delete(item)
        db.commit()
        raise HTTPException(status_code=204)
    item.quantity = quantity
    db.commit()
    return db.query(CartItem).options(
        joinedload(CartItem.product).joinedload(Product.category),
        joinedload(CartItem.product).joinedload(Product.images),
    ).filter(CartItem.id == item.id).first()


@router.delete("/{item_id}", status_code=204)
def remove_from_cart(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(item)
    db.commit()


@router.delete("", status_code=204)
def clear_cart(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(CartItem).filter(CartItem.user_id == user.id).delete()
    db.commit()
