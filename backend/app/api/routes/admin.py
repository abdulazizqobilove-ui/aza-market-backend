from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import require_admin
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.order import Order
from app.models.payout import Payout, PayoutStatus
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
    return {
        "users": db.query(User).count(),
        "products": db.query(Product).filter(Product.is_active == True).count(),
        "orders": db.query(Order).count(),
        "sellers": db.query(User).filter(User.role == UserRole.seller).count(),
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
        # Возвращаем деньги продавцу при отклонении
        seller = db.query(User).filter(User.id == payout.seller_id).first()
        if seller:
            seller.balance = (seller.balance or 0) + payout.amount

    payout.status = data.status
    payout.comment = data.comment
    db.commit()
    db.refresh(payout)
    return payout
