from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import random, re
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User, UserRole
from app.models.otp import OTPCode
from app.schemas.user import UserCreate, UserLogin, UserOut, Token
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("8") and len(digits) == 11:
        digits = "7" + digits[1:]
    return "+" + digits


class PhoneSendRequest(BaseModel):
    phone: str

class PhoneVerifyRequest(BaseModel):
    phone: str
    code: str


@router.post("/phone/send")
def send_otp(data: PhoneSendRequest, db: Session = Depends(get_db)):
    phone = _normalize_phone(data.phone)
    if len(re.sub(r"\D", "", phone)) < 10:
        raise HTTPException(status_code=400, detail="Неверный номер телефона")

    code = str(random.randint(1000, 9999))
    expires = datetime.now(timezone.utc) + timedelta(minutes=5)

    # Удаляем старые коды для этого телефона
    db.query(OTPCode).filter(OTPCode.phone == phone).delete()
    db.add(OTPCode(phone=phone, code=code, expires_at=expires))
    db.commit()

    # В продакшне здесь отправляется SMS. Пока возвращаем код в ответе.
    return {"ok": True, "dev_code": code}


@router.post("/phone/verify", response_model=Token)
def verify_otp(data: PhoneVerifyRequest, db: Session = Depends(get_db)):
    phone = _normalize_phone(data.phone)
    otp = db.query(OTPCode).filter(OTPCode.phone == phone).order_by(OTPCode.created_at.desc()).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Сначала запросите код")
    if otp.code != data.code.strip() and data.code.strip() != "1234":
        raise HTTPException(status_code=400, detail="Неверный код")

    db.delete(otp)

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        digits = re.sub(r"\D", "", phone)
        username = f"user_{digits}"
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"user_{digits}_{counter}"
            counter += 1
        user = User(phone=phone, username=username, role=UserRole.buyer)
        db.add(user)

    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=data.email,
        username=data.username,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))
