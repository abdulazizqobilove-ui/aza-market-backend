from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
import os, uuid, shutil
from datetime import datetime, timedelta
from app.core.database import get_db
from app.api.deps import require_seller
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User
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


@router.get("/stats")
def seller_stats(db: Session = Depends(get_db), seller: User = Depends(require_seller)):
    now = datetime.utcnow()
    d7 = now - timedelta(days=7)
    d30 = now - timedelta(days=30)

    # Seller's products
    products = db.query(Product).filter(Product.seller_id == seller.id).all()
    product_ids = [p.id for p in products]

    total_products = len(products)
    active_products = sum(1 for p in products if p.is_active and p.stock > 0)
    out_of_stock = sum(1 for p in products if p.stock == 0)

    # Orders containing seller's products
    order_ids_q = db.query(OrderItem.order_id).filter(
        OrderItem.product_id.in_(product_ids)
    ).distinct().subquery()

    all_orders = db.query(Order).filter(Order.id.in_(order_ids_q)).all()

    def count_status(status):
        return sum(1 for o in all_orders if o.status == status)

    orders_total = len(all_orders)
    orders_7d = sum(1 for o in all_orders if o.created_at and o.created_at >= d7)
    orders_30d = sum(1 for o in all_orders if o.created_at and o.created_at >= d30)

    # Revenue from delivered orders only
    def revenue_from(orders_list):
        total = 0.0
        for o in orders_list:
            if o.status == OrderStatus.delivered:
                items = db.query(OrderItem).filter(
                    OrderItem.order_id == o.id,
                    OrderItem.product_id.in_(product_ids)
                ).all()
                total += sum(i.price * i.quantity for i in items)
        return total

    rev_total = revenue_from(all_orders)
    rev_7d = revenue_from([o for o in all_orders if o.created_at and o.created_at >= d7])
    rev_30d = revenue_from([o for o in all_orders if o.created_at and o.created_at >= d30])

    # Chart: last 7 days
    chart = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_orders = [o for o in all_orders if o.created_at and day_start <= o.created_at < day_end and o.status == OrderStatus.delivered]
        day_rev = 0.0
        for o in day_orders:
            items = db.query(OrderItem).filter(
                OrderItem.order_id == o.id,
                OrderItem.product_id.in_(product_ids)
            ).all()
            day_rev += sum(it.price * it.quantity for it in items)
        chart.append({"date": day.strftime("%d.%m"), "revenue": round(day_rev)})

    # Ratings
    from app.models.review import Review
    reviews = db.query(Review).filter(Review.product_id.in_(product_ids)).all() if product_ids else []
    avg_rating = round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else 0.0
    total_reviews = len(reviews)

    # Top products
    top = sorted(products, key=lambda p: p.sales_count or 0, reverse=True)[:5]
    top_products = []
    for p in top:
        img = next((i.url for i in p.images if i.is_main), None) or (p.images[0].url if p.images else None)
        top_products.append({
            "id": p.id, "title": p.title, "price": p.price,
            "sales_count": p.sales_count or 0, "stock": p.stock,
            "image_url": img,
        })

    return {
        "products": {"total": total_products, "active": active_products, "out_of_stock": out_of_stock},
        "orders": {
            "total": orders_total,
            "pending": count_status(OrderStatus.pending),
            "confirmed": count_status(OrderStatus.confirmed),
            "processing": count_status(OrderStatus.processing),
            "shipped": count_status(OrderStatus.shipped),
            "delivered": count_status(OrderStatus.delivered),
            "cancelled": count_status(OrderStatus.cancelled),
        },
        "revenue": {"total": round(rev_total), "last_7d": round(rev_7d), "last_30d": round(rev_30d)},
        "orders_7d": orders_7d,
        "orders_30d": orders_30d,
        "avg_rating": avg_rating,
        "total_reviews": total_reviews,
        "top_products": top_products,
        "chart_7d": chart,
    }


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
    ext = os.path.splitext(file.filename)[1]
    filename = f"banner_{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    seller.shop_banner_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(seller)
    return seller


@router.post("/shop/logo", response_model=UserOut)
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    ext = os.path.splitext(file.filename)[1]
    filename = f"logo_{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    seller.shop_logo_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(seller)
    return seller
