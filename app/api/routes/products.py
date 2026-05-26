from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, text as sa_text
from typing import List, Optional
import os, uuid, shutil
from app.core.database import get_db
from app.core.config import settings
from app.core.upload import upload_image as cloud_upload
from app.api.deps import get_current_user, require_seller
from app.models.product import Product, Category, ProductImage
from app.models.user import User
from app.models.waitlist import Waitlist
from app.models.notification import Notification
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductListOut, CategoryOut

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.parent_id == None).all()


@router.get("/categories/{cat_id}/subcategories", response_model=List[CategoryOut])
def get_subcategories(cat_id: int, db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.parent_id == cat_id).all()


@router.get("", response_model=dict)
def list_products(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    brand: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
    sort: str = Query("popular", enum=["popular", "newest", "price_asc", "price_desc", "rating"]),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(Product.is_active == True)

    if q:
        query = query.filter(or_(
            Product.title.ilike(f"%{q}%"),
            Product.brand.ilike(f"%{q}%"),
        ))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if brand:
        query = query.filter(Product.brand.ilike(f"%{brand}%"))
    if min_rating is not None:
        query = query.filter(Product.rating >= min_rating)

    sort_map = {
        # score = продажи*0.6 + рейтинг*6 + свежесть за 30 дней +5
        "popular": sa_text(
            "COALESCE(sales_count,0)*0.6 + COALESCE(rating,0)*6.0 "
            "+ CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 5 ELSE 0 END DESC"
        ),
        "newest": Product.created_at.desc(),
        "price_asc": Product.price.asc(),
        "price_desc": Product.price.desc(),
        "rating": Product.rating.desc(),
    }
    query = query.order_by(sort_map[sort])

    total = query.count()
    products = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "items": [ProductListOut.model_validate(p) for p in products],
    }


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(Product.id == product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=ProductOut, status_code=201)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    category = db.query(Category).filter(Category.id == data.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    product = Product(**data.model_dump(), seller_id=seller.id)
    db.add(product)
    db.commit()
    db.refresh(product)
    return db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(Product.id == product.id).first()


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    was_out_of_stock = product.stock == 0
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(product, field, value)

    # Уведомить пользователей из листа ожидания если товар появился в наличии
    if was_out_of_stock and product.stock > 0:
        waitlist_users = db.query(Waitlist).filter(Waitlist.product_id == product_id).all()
        for w in waitlist_users:
            db.add(Notification(
                user_id=w.user_id,
                title="Товар появился в наличии",
                body=f"«{product.title}» снова доступен для заказа",
            ))

    db.commit()
    db.refresh(product)
    return db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(Product.id == product.id).first()


@router.patch("/{product_id}/toggle", response_model=ProductOut)
def toggle_product_active(
    product_id: int,
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = not product.is_active
    db.commit()
    db.refresh(product)
    return db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(Product.id == product.id).first()


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()


@router.post("/{product_id}/images", response_model=ProductOut)
def upload_images(
    product_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    has_main = bool(product.images)
    for i, file in enumerate(files):
        url = cloud_upload(file, folder="products")
        is_main = not has_main and i == 0
        db.add(ProductImage(product_id=product.id, url=url, is_main=is_main))
        has_main = True
    db.commit()

    return db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(Product.id == product.id).first()
