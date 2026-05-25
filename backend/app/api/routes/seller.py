from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import os, uuid, shutil
from app.core.database import get_db
from app.core.upload import upload_image as cloud_upload
from app.api.deps import require_seller
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User
from app.models.review import Review
from app.models.payout import Payout, PayoutStatus
from app.schemas.product import ProductListOut
from app.schemas.order import OrderOut
from app.schemas.payout import PayoutCreate, PayoutOut, SellerBalanceOut
from app.schemas.user import UserOut
from app.core.config import settings


class ShopProfileUpdate(BaseModel):
    shop_name: Optional[str] = None
    shop_description: Optional[str] = None

router = APIRouter(prefix="/seller", tags=["seller"])


@router.get("/products", response_model=List[ProductListOut])
def seller_products(db: Session = Depends(get_db), seller: User = Depends(require_seller)):
    return db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(Product.seller_id == seller.id).order_by(Product.created_at.desc()).all()


@router.get("/orders", response_model=List[OrderOut])
def seller_orders(db: Session = Depends(get_db), seller: User = Depends(require_seller)):
    product_ids = [p.id for p in db.query(Product.id).filter(Product.seller_id == seller.id).all()]
    if not product_ids:
        return []

    order_ids = [
        oi.order_id for oi in
        db.query(OrderItem.order_id).filter(OrderItem.product_id.in_(product_ids)).distinct().all()
    ]

    return db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.category),
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.images),
    ).filter(Order.id.in_(order_ids)).order_by(Order.created_at.desc()).all()


@router.get("/balance", response_model=SellerBalanceOut)
def seller_balance(db: Session = Depends(get_db), seller: User = Depends(require_seller)):
    payouts = db.query(Payout).filter(Payout.seller_id == seller.id).order_by(Payout.created_at.desc()).all()
    total_withdrawn = sum(p.amount for p in payouts if p.status == PayoutStatus.approved)
    total_earned = (seller.balance or 0) + total_withdrawn
    return SellerBalanceOut(
        balance=seller.balance or 0,
        total_earned=total_earned,
        total_withdrawn=total_withdrawn,
        payouts=payouts,
    )


@router.post("/payouts", response_model=PayoutOut, status_code=201)
def request_payout(data: PayoutCreate, db: Session = Depends(get_db), seller: User = Depends(require_seller)):
    if (seller.balance or 0) < data.amount:
        raise HTTPException(status_code=400, detail="Недостаточно средств на балансе")
    if data.amount < 100:
        raise HTTPException(status_code=400, detail="Минимальная сумма вывода — 100 ₽")

    seller.balance = (seller.balance or 0) - data.amount
    payout = Payout(seller_id=seller.id, amount=data.amount, bank_details=data.bank_details)
    db.add(payout)
    db.commit()
    db.refresh(payout)
    return payout


@router.get("/payouts", response_model=List[PayoutOut])
def list_payouts(db: Session = Depends(get_db), seller: User = Depends(require_seller)):
    return db.query(Payout).filter(Payout.seller_id == seller.id).order_by(Payout.created_at.desc()).all()


@router.get("/stats")
def seller_stats(db: Session = Depends(get_db), seller: User = Depends(require_seller)):
    now = datetime.now(timezone.utc)
    day7 = now - timedelta(days=7)
    day30 = now - timedelta(days=30)

    product_ids = [p.id for p in db.query(Product.id).filter(Product.seller_id == seller.id).all()]
    if not product_ids:
        return {
            "products": {"total": 0, "active": 0, "out_of_stock": 0},
            "orders": {"total": 0, "pending": 0, "processing": 0, "delivered": 0, "cancelled": 0},
            "revenue": {"total": 0, "last_7d": 0, "last_30d": 0},
            "orders_7d": 0, "orders_30d": 0,
            "avg_rating": 0.0, "total_reviews": 0,
            "top_products": [],
            "chart_7d": [],
        }

    # Products stats
    prods = db.query(Product).filter(Product.seller_id == seller.id).all()
    prod_total = len(prods)
    prod_active = sum(1 for p in prods if p.is_active)
    prod_oos = sum(1 for p in prods if p.stock == 0)

    # Order IDs for this seller
    order_ids = [
        oi.order_id for oi in
        db.query(OrderItem.order_id).filter(OrderItem.product_id.in_(product_ids)).distinct().all()
    ]

    orders = db.query(Order).filter(Order.id.in_(order_ids)).all() if order_ids else []

    def order_revenue(o: Order) -> float:
        return sum(
            i.price * i.quantity
            for i in o.items
            if i.product_id in product_ids
        )

    delivered = [o for o in orders if o.status == OrderStatus.delivered]
    total_revenue = sum(order_revenue(o) for o in delivered)
    rev_7d = sum(order_revenue(o) for o in delivered if o.created_at and o.created_at.replace(tzinfo=timezone.utc) >= day7)
    rev_30d = sum(order_revenue(o) for o in delivered if o.created_at and o.created_at.replace(tzinfo=timezone.utc) >= day30)
    orders_7d = sum(1 for o in orders if o.created_at and o.created_at.replace(tzinfo=timezone.utc) >= day7)
    orders_30d = sum(1 for o in orders if o.created_at and o.created_at.replace(tzinfo=timezone.utc) >= day30)

    status_counts = {}
    for s in OrderStatus:
        status_counts[s.value] = sum(1 for o in orders if o.status == s)

    # Reviews
    reviews = db.query(Review).filter(Review.product_id.in_(product_ids)).all()
    avg_rating = round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else 0.0

    # Top 5 products by sales_count
    top = sorted(prods, key=lambda p: p.sales_count or 0, reverse=True)[:5]
    top_products = [
        {
            "id": p.id, "title": p.title, "price": p.price,
            "sales_count": p.sales_count or 0, "stock": p.stock,
            "image_url": p.images[0].url if p.images else None,
        }
        for p in top
    ]

    # Chart: revenue per day for last 7 days
    chart_7d = []
    for i in range(6, -1, -1):
        day_start = now - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_rev = sum(
            order_revenue(o) for o in delivered
            if o.created_at
            and day_start.replace(hour=0, minute=0, second=0, microsecond=0) <=
               o.created_at.replace(tzinfo=timezone.utc) <
               day_end.replace(hour=0, minute=0, second=0, microsecond=0)
        )
        chart_7d.append({
            "date": (now - timedelta(days=i)).strftime("%d.%m"),
            "revenue": round(day_rev),
        })

    return {
        "products": {"total": prod_total, "active": prod_active, "out_of_stock": prod_oos},
        "orders": {
            "total": len(orders),
            **status_counts,
        },
        "revenue": {"total": round(total_revenue), "last_7d": round(rev_7d), "last_30d": round(rev_30d)},
        "orders_7d": orders_7d,
        "orders_30d": orders_30d,
        "avg_rating": avg_rating,
        "total_reviews": len(reviews),
        "top_products": top_products,
        "chart_7d": chart_7d,
    }


@router.patch("/shop", response_model=UserOut)
def update_shop_profile(
    data: ShopProfileUpdate,
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(seller, field, value)
    db.commit()
    db.refresh(seller)
    return seller


@router.post("/shop/banner", response_model=UserOut)
def upload_banner(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    seller.shop_banner_url = cloud_upload(file, folder="marketplace/banners")
    db.commit()
    db.refresh(seller)
    return seller


@router.post("/shop/logo", response_model=UserOut)
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    seller.shop_logo_url = cloud_upload(file, folder="marketplace/logos")
    db.commit()
    db.refresh(seller)
    return seller
