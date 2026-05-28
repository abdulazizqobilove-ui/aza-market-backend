from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
import os, uuid, shutil
from datetime import datetime, timedelta, timezone
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
    try:
     return _seller_stats_impl(db, seller)
    except Exception as e:
     import traceback
     raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}\n{traceback.format_exc()}")

def _seller_stats_impl(db: Session, seller: User):
    from app.models.review import Review
    from app.models.product import ProductImage

    now = datetime.now(timezone.utc)
    d7  = now - timedelta(days=7)
    d30 = now - timedelta(days=30)

    # ── Products ──────────────────────────────────────────────
    products = db.query(Product).filter(Product.seller_id == seller.id).all()
    product_ids = [p.id for p in products]

    total_products  = len(products)
    active_products = sum(1 for p in products if p.is_active and p.stock > 0)
    out_of_stock    = sum(1 for p in products if p.stock == 0)

    if not product_ids:
        return {
            "products": {"total": 0, "active": 0, "out_of_stock": 0},
            "orders": {"total": 0, "pending": 0, "confirmed": 0, "processing": 0, "shipped": 0, "delivered": 0, "cancelled": 0},
            "revenue": {"total": 0, "last_7d": 0, "last_30d": 0},
            "orders_7d": 0, "orders_30d": 0,
            "avg_rating": 0.0, "total_reviews": 0,
            "top_products": [],
            "chart_7d": [{"date": (now - timedelta(days=i)).strftime("%d.%m"), "revenue": 0} for i in range(6, -1, -1)],
        }

    # ── Orders ────────────────────────────────────────────────
    order_ids = [
        row[0] for row in
        db.query(OrderItem.order_id)
          .filter(OrderItem.product_id.in_(product_ids))
          .distinct().all()
    ]
    all_orders = db.query(Order).filter(Order.id.in_(order_ids)).all() if order_ids else []

    def count_status(s):
        return sum(1 for o in all_orders if o.status == s)

    orders_total = len(all_orders)
    orders_7d    = sum(1 for o in all_orders if o.created_at and o.created_at >= d7)
    orders_30d   = sum(1 for o in all_orders if o.created_at and o.created_at >= d30)

    # ── Revenue ────────────────────────────────────────────────
    # Pre-fetch all seller items in those orders in one query
    all_items = (
        db.query(OrderItem)
          .filter(OrderItem.order_id.in_(order_ids), OrderItem.product_id.in_(product_ids))
          .all()
    ) if order_ids else []

    delivered_order_ids = {o.id for o in all_orders if o.status == OrderStatus.delivered}
    delivered_7d_ids    = {o.id for o in all_orders if o.status == OrderStatus.delivered and o.created_at and o.created_at >= d7}
    delivered_30d_ids   = {o.id for o in all_orders if o.status == OrderStatus.delivered and o.created_at and o.created_at >= d30}

    rev_total = sum(i.price * i.quantity for i in all_items if i.order_id in delivered_order_ids)
    rev_7d    = sum(i.price * i.quantity for i in all_items if i.order_id in delivered_7d_ids)
    rev_30d   = sum(i.price * i.quantity for i in all_items if i.order_id in delivered_30d_ids)

    # ── Chart 7d ──────────────────────────────────────────────
    chart = []
    for days_ago in range(6, -1, -1):
        day        = now - timedelta(days=days_ago)
        day_start  = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end    = day_start + timedelta(days=1)
        day_del_ids = {
            o.id for o in all_orders
            if o.status == OrderStatus.delivered and o.created_at and day_start <= o.created_at < day_end
        }
        day_rev = sum(i.price * i.quantity for i in all_items if i.order_id in day_del_ids)
        chart.append({"date": day.strftime("%d.%m"), "revenue": round(day_rev)})

    # ── Reviews ────────────────────────────────────────────────
    reviews     = db.query(Review).filter(Review.product_id.in_(product_ids)).all()
    avg_rating  = round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else 0.0
    total_reviews = len(reviews)

    # ── Top products ───────────────────────────────────────────
    # Fetch images in one query
    images_by_product: dict = {}
    for img in db.query(ProductImage).filter(ProductImage.product_id.in_(product_ids)).all():
        images_by_product.setdefault(img.product_id, []).append(img)

    top = sorted(products, key=lambda p: p.sales_count or 0, reverse=True)[:5]
    top_products = []
    for p in top:
        imgs = images_by_product.get(p.id, [])
        img_url = next((i.url for i in imgs if i.is_main), imgs[0].url if imgs else None)
        top_products.append({
            "id": p.id, "title": p.title, "price": p.price,
            "sales_count": p.sales_count or 0, "stock": p.stock,
            "image_url": img_url,
        })

    return {
        "products": {"total": total_products, "active": active_products, "out_of_stock": out_of_stock},
        "orders": {
            "total": orders_total,
            "pending":    count_status(OrderStatus.pending),
            "confirmed":  count_status(OrderStatus.confirmed),
            "processing": count_status(OrderStatus.processing),
            "shipped":    count_status(OrderStatus.shipped),
            "delivered":  count_status(OrderStatus.delivered),
            "cancelled":  count_status(OrderStatus.cancelled),
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
