from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.waitlist import Waitlist
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductListOut

router = APIRouter(prefix="/waitlist", tags=["waitlist"])


@router.get("", response_model=List[ProductListOut])
def get_waitlist(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = db.query(Waitlist).filter(Waitlist.user_id == user.id).all()
    product_ids = [i.product_id for i in items]
    if not product_ids:
        return []
    return db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(Product.id.in_(product_ids)).all()


@router.post("/{product_id}", status_code=201)
def add_to_waitlist(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = db.query(Waitlist).filter(Waitlist.user_id == user.id, Waitlist.product_id == product_id).first()
    if existing:
        return {"ok": True}
    db.add(Waitlist(user_id=user.id, product_id=product_id))
    db.commit()
    return {"ok": True}


@router.delete("/{product_id}", status_code=204)
def remove_from_waitlist(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Waitlist).filter(Waitlist.user_id == user.id, Waitlist.product_id == product_id).delete()
    db.commit()
