from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.review import Review
from app.models.product import Product
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewOut

router = APIRouter(prefix="/products", tags=["reviews"])


@router.get("/{product_id}/reviews", response_model=List[ReviewOut])
def get_reviews(product_id: int, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.product_id == product_id).order_by(Review.created_at.desc()).all()
    result = []
    for r in reviews:
        out = ReviewOut.model_validate(r)
        out.username = r.user.username if r.user else ""
        result.append(out)
    return result


@router.post("/{product_id}/reviews", response_model=ReviewOut, status_code=201)
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
