from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.favorite import Favorite
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductListOut

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=List[ProductListOut])
def get_favorites(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    favs = db.query(Favorite).options(
        joinedload(Favorite.product).joinedload(Product.category),
        joinedload(Favorite.product).joinedload(Product.images),
    ).filter(Favorite.user_id == user.id).all()
    return [ProductListOut.model_validate(f.product) for f in favs]


@router.post("/{product_id}", status_code=201)
def add_favorite(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.product_id == product_id).first()
    if not existing:
        fav = Favorite(user_id=user.id, product_id=product_id)
        db.add(fav)
        db.commit()
    return {"ok": True}


@router.delete("/{product_id}", status_code=204)
def remove_favorite(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    fav = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.product_id == product_id).first()
    if fav:
        db.delete(fav)
        db.commit()
