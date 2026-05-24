from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
import os, uuid, shutil
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.payment_card import PaymentCard
from app.schemas.user import UserOut
from app.core.config import settings

router = APIRouter(prefix="/users", tags=["users"])


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class CardCreate(BaseModel):
    last4: str
    card_holder: str
    expiry: str
    card_type: str = "visa"


class CardOut(BaseModel):
    id: int
    last4: str
    card_holder: str
    expiry: str
    card_type: str
    is_default: bool

    class Config:
        from_attributes = True


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(data: UserUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/me/avatar", response_model=UserOut)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "avatar.jpg")[1] or ".jpg"
    filename = f"avatar_{user.id}_{uuid.uuid4().hex}{ext}"
    dest = os.path.join(settings.UPLOAD_DIR, filename)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    user.avatar_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(user)
    return user


# Payment cards
@router.get("/me/cards", response_model=List[CardOut])
def list_cards(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(PaymentCard).filter(PaymentCard.user_id == user.id).order_by(PaymentCard.is_default.desc()).all()


@router.post("/me/cards", response_model=CardOut, status_code=201)
def add_card(data: CardCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = db.query(PaymentCard).filter(PaymentCard.user_id == user.id).count()
    card = PaymentCard(
        user_id=user.id,
        last4=data.last4[-4:],
        card_holder=data.card_holder.upper(),
        expiry=data.expiry,
        card_type=data.card_type,
        is_default=(existing == 0),
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.patch("/me/cards/{card_id}/default", response_model=CardOut)
def set_default_card(card_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(PaymentCard).filter(PaymentCard.user_id == user.id).update({"is_default": False})
    card = db.query(PaymentCard).filter(PaymentCard.id == card_id, PaymentCard.user_id == user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card.is_default = True
    db.commit()
    db.refresh(card)
    return card


@router.delete("/me/cards/{card_id}", status_code=204)
def delete_card(card_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    card = db.query(PaymentCard).filter(PaymentCard.id == card_id, PaymentCard.user_id == user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
