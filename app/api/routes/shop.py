from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.product import Product
from app.schemas.user import ShopOut
from app.schemas.product import ProductListOut
from typing import List

router = APIRouter(prefix="/shop", tags=["shop"])


@router.get("/{seller_id}", response_model=ShopOut)
def get_shop(seller_id: int, db: Session = Depends(get_db)):
    seller = db.query(User).filter(
        User.id == seller_id,
        User.role.in_([UserRole.seller, UserRole.admin]),
        User.is_active == True,
    ).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Магазин не найден")

    stats = db.query(
        func.avg(Product.rating).label("avg_rating"),
        func.sum(Product.reviews_count).label("total_reviews"),
    ).filter(Product.seller_id == seller_id, Product.is_active == True).first()

    result = ShopOut.model_validate(seller)
    result.rating = round(float(stats.avg_rating), 1) if stats.avg_rating else None
    result.reviews_count = int(stats.total_reviews) if stats.total_reviews else 0
    return result


@router.get("/{seller_id}/products", response_model=List[ProductListOut])
def get_shop_products(seller_id: int, db: Session = Depends(get_db)):
    return db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(
        Product.seller_id == seller_id,
        Product.is_active == True,
    ).order_by(Product.created_at.desc()).all()
