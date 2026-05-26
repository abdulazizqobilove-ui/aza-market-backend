from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.user import User, UserRole
from app.models.product import Product, ProductImage, Category
from app.models.order import Order, OrderItem, OrderStatus
from app.models.payout import Payout, PayoutStatus
from app.models.review import Review
from app.models.report import Report, ReportType, ReportStatus
from app.schemas.user import UserOut
from app.schemas.order import OrderOut, OrderStatusUpdate
from app.schemas.payout import PayoutOut
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])


class UserRoleUpdate(BaseModel):
    role: UserRole

class UserActiveUpdate(BaseModel):
    is_active: bool


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    now = datetime.now(timezone.utc)
    day7 = now - timedelta(days=7)
    day30 = now - timedelta(days=30)

    # Basic counts
    total_users = db.query(User).count()
    total_products = db.query(Product).filter(Product.is_active == True).count()
    total_orders = db.query(Order).count()
    total_sellers = db.query(User).filter(User.role == UserRole.seller).count()
    new_users_7d = db.query(User).filter(User.created_at >= day7).count()
    new_users_30d = db.query(User).filter(User.created_at >= day30).count()

    # Revenue from delivered orders
    delivered_orders = db.query(Order).options(joinedload(Order.items)).filter(Order.status == OrderStatus.delivered).all()

    def order_total(o: Order) -> float:
        return sum(i.price * i.quantity for i in o.items)

    total_revenue = sum(order_total(o) for o in delivered_orders)
    rev_7d = sum(order_total(o) for o in delivered_orders if o.created_at and o.created_at.replace(tzinfo=timezone.utc) >= day7)
    rev_30d = sum(order_total(o) for o in delivered_orders if o.created_at and o.created_at.replace(tzinfo=timezone.utc) >= day30)

    # Orders by status
    all_orders = db.query(Order).all()
    status_counts = {s.value: sum(1 for o in all_orders if o.status == s) for s in OrderStatus}
    orders_7d = sum(1 for o in all_orders if o.created_at and o.created_at.replace(tzinfo=timezone.utc) >= day7)
    orders_30d = sum(1 for o in all_orders if o.created_at and o.created_at.replace(tzinfo=timezone.utc) >= day30)

    # Reviews
    all_reviews = db.query(Review).all()
    avg_rating = round(sum(r.rating for r in all_reviews) / len(all_reviews), 1) if all_reviews else 0.0

    # Top 5 products by sales_count
    from sqlalchemy import desc, func as sqlfunc
    top_products_q = db.query(Product).options(joinedload(Product.images)).filter(Product.is_active == True).order_by(desc(sqlfunc.coalesce(Product.sales_count, 0))).limit(5).all()
    top_products = [
        {
            "id": p.id, "title": p.title, "price": p.price,
            "sales_count": p.sales_count or 0, "stock": p.stock,
            "image_url": p.images[0].url if p.images else None,
        }
        for p in top_products_q
    ]

    # Top 5 sellers by revenue
    sellers = db.query(User).filter(User.role == UserRole.seller).all()
    seller_revenues = []
    for seller in sellers:
        product_ids = [p.id for p in db.query(Product.id).filter(Product.seller_id == seller.id).all()]
        if not product_ids:
            continue
        rev = sum(
            i.price * i.quantity
            for o in delivered_orders
            for i in o.items
            if i.product_id in product_ids
        )
        seller_revenues.append({
            "id": seller.id,
            "username": seller.username or seller.phone or "—",
            "shop_name": seller.shop_name or seller.username or "—",
            "revenue": round(rev),
            "products": len(product_ids),
        })
    top_sellers = sorted(seller_revenues, key=lambda x: x["revenue"], reverse=True)[:5]

    # 7-day revenue chart
    chart_7d = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_rev = sum(
            order_total(o) for o in delivered_orders
            if o.created_at and day_start <= o.created_at.replace(tzinfo=timezone.utc) < day_end
        )
        chart_7d.append({"date": day_start.strftime("%d.%m"), "revenue": round(day_rev)})

    return {
        "users": total_users,
        "products": total_products,
        "orders": total_orders,
        "sellers": total_sellers,
        "new_users_7d": new_users_7d,
        "new_users_30d": new_users_30d,
        "revenue": {"total": round(total_revenue), "last_7d": round(rev_7d), "last_30d": round(rev_30d)},
        "orders_by_status": status_counts,
        "orders_7d": orders_7d,
        "orders_30d": orders_30d,
        "avg_rating": avg_rating,
        "total_reviews": len(all_reviews),
        "top_products": top_products,
        "top_sellers": top_sellers,
        "chart_7d": chart_7d,
    }


@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/role", response_model=UserOut)
def update_user_role(user_id: int, data: UserRoleUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = data.role
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/active", response_model=UserOut)
def update_user_active(user_id: int, data: UserActiveUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return user


@router.get("/products")
def list_all_products(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    products = db.query(Product).order_by(Product.created_at.desc()).all()
    return [{"id": p.id, "title": p.title, "price": p.price, "stock": p.stock, "is_active": p.is_active, "seller_id": p.seller_id} for p in products]


@router.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    db.commit()


@router.get("/orders", response_model=List[OrderOut])
def list_all_orders(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    from sqlalchemy.orm import joinedload
    from app.models.order import OrderItem
    return db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.category),
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.images),
    ).order_by(Order.created_at.desc()).all()


class PayoutReview(BaseModel):
    status: PayoutStatus
    comment: Optional[str] = None


@router.get("/payouts", response_model=List[PayoutOut])
def list_all_payouts(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(Payout).order_by(Payout.created_at.desc()).all()


@router.patch("/payouts/{payout_id}", response_model=PayoutOut)
def review_payout(payout_id: int, data: PayoutReview, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    payout = db.query(Payout).filter(Payout.id == payout_id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    if payout.status != PayoutStatus.pending:
        raise HTTPException(status_code=400, detail="Заявка уже обработана")

    if data.status == PayoutStatus.rejected:
        seller = db.query(User).filter(User.id == payout.seller_id).first()
        if seller:
            seller.balance = (seller.balance or 0) + payout.amount

    payout.status = data.status
    payout.comment = data.comment
    db.commit()
    db.refresh(payout)
    return payout


# ── Product moderation ──

class ProductActiveUpdate(BaseModel):
    is_active: bool


@router.patch("/products/{product_id}/active")
def set_product_active(product_id: int, data: ProductActiveUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = data.is_active
    db.commit()
    return {"id": product_id, "is_active": data.is_active}


# ── Reports ──

class ReportCreate(BaseModel):
    type: ReportType
    target_id: int
    reason: str
    comment: Optional[str] = None


class ReportOut(BaseModel):
    id: int
    type: ReportType
    target_id: int
    reason: str
    comment: Optional[str]
    status: ReportStatus
    reporter_id: int
    created_at: datetime
    model_config = {"from_attributes": True}


class ReportReview(BaseModel):
    status: ReportStatus


@router.post("/reports", response_model=ReportOut, status_code=201)
def create_report(data: ReportCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    report = Report(reporter_id=user.id, **data.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/reports", response_model=List[ReportOut])
def list_reports(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(Report).order_by(Report.created_at.desc()).all()


@router.patch("/reports/{report_id}", response_model=ReportOut)
def update_report(report_id: int, data: ReportReview, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Not found")
    report.status = data.status
    db.commit()
    db.refresh(report)
    return report


# ── Category management ──

class CategoryCreate(BaseModel):
    name: str
    slug: str
    parent_id: Optional[int] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    parent_id: Optional[int]
    model_config = {"from_attributes": True}


@router.get("/categories", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    from sqlalchemy import text as _t
    return db.query(Category).order_by(_t("parent_id NULLS FIRST"), Category.id).all()


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if db.query(Category).filter(Category.slug == data.slug).first():
        raise HTTPException(status_code=400, detail="Slug уже существует")
    cat = Category(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/categories/{cat_id}", response_model=CategoryOut)
def update_category(cat_id: int, data: CategoryUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{cat_id}", status_code=204)
def delete_category(cat_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Not found")
    if db.query(Product).filter(Product.category_id == cat_id).first():
        raise HTTPException(status_code=400, detail="Есть товары в этой категории")
    db.delete(cat)
    db.commit()
