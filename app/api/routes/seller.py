from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
import os, uuid, shutil
from app.core.database import get_db
from app.api.deps import require_seller
from app.models.product import Product
from app.models.order import Order, OrderItem
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
