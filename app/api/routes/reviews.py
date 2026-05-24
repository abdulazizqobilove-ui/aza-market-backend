from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os, uuid, shutil
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.review import Review
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewOut
from app.core.config import settings

router = APIRouter(tags=["reviews"])


class ReviewableProduct(BaseModel):
    product_id: int
    product_title: str
    product_image: Optional[str] = None
    order_date: datetime
    review: Optional[ReviewOut] = None

    class Config:
        from_attributes = True


@router.get("/reviews/my", response_model=dict)
def my_reviews(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    orders = db.query(Order).filter(
        Order.buyer_id == user.id,
        Order.status.in_([OrderStatus.delivered, OrderStatus.confirmed, OrderStatus.shipped, OrderStatus.processing])
    ).all()

    seen_product_ids = set()
    to_review = []
    reviewed = []

    for order in orders:
        for item in order.items:
            if item.product_id in seen_product_ids:
                continue
            seen_product_ids.add(item.product_id)
            product = item.product
            if not product:
                continue
            main_img = next((i.url for i in product.images if i.is_main), None) or (product.images[0].url if product.images else None)
            existing = db.query(Review).filter(Review.product_id == product.id, Review.user_id == user.id).first()
            entry = {
                "product_id": product.id,
                "product_title": product.title,
                "product_image": main_img,
                "order_date": order.created_at,
                "review": None,
            }
            if existing:
                r_out = ReviewOut.model_validate(existing)
                r_out.username = user.username
                entry["review"] = r_out.model_dump()
                reviewed.append(entry)
            else:
                to_review.append(entry)

    return {"to_review": to_review, "reviewed": reviewed}


router_products = APIRouter(prefix="/products", tags=["reviews"])


@router_products.get("/{product_id}/reviews", response_model=List[ReviewOut])
def get_reviews(product_id: int, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.product_id == product_id).order_by(Review.created_at.desc()).all()
    result = []
    for r in reviews:
        out = ReviewOut.model_validate(r)
        out.username = r.user.username if r.user else ""
        result.append(out)
    return result


@router_products.post("/{product_id}/reviews", response_model=ReviewOut, status_code=201)
def create_review(
    product_id: int,
    data: ReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = db.query(Review).filter(Review.product_id == product_id, Review.user_id == user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this product")

    review = Review(product_id=product_id, user_id=user.id, rating=data.rating, text=data.text)
    db.add(review)

    all_reviews = db.query(Review).filter(Review.product_id == product_id).all()
    total = sum(r.rating for r in all_reviews) + data.rating
    product.rating = round(total / (len(all_reviews) + 1), 1)
    product.reviews_count = len(all_reviews) + 1

    db.commit()
    db.refresh(review)

    out = ReviewOut.model_validate(review)
    out.username = user.username
    return out


@router_products.post("/{product_id}/reviews/{review_id}/images", response_model=ReviewOut)
def upload_review_image(
    product_id: int,
    review_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    review = db.query(Review).filter(Review.id == review_id, Review.product_id == product_id, Review.user_id == user.id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    ext = os.path.splitext(file.filename or "img.jpg")[1] or ".jpg"
    filename = f"review_{review_id}_{uuid.uuid4().hex}{ext}"
    dest = os.path.join(settings.UPLOAD_DIR, filename)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    url = f"/uploads/{filename}"
    current = list(review.images or [])
    current.append(url)
    from sqlalchemy.orm.attributes import flag_modified
    review.images = current
    flag_modified(review, "images")
    db.commit()
    db.refresh(review)

    out = ReviewOut.model_validate(review)
    out.username = user.username
    return out
