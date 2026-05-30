from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/payments", tags=["payments"])


class PaymentOut(BaseModel):
    id: int
    order_id: int
    amount: float
    currency: str
    method: str
    status: str
    provider_ref: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Получить статус оплаты по заказу ──────────────────────────
@router.get("/order/{order_id}", response_model=PaymentOut)
def get_payment(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order or order.buyer_id != user.id:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    if not order.payment:
        raise HTTPException(status_code=404, detail="Платёж не найден")
    return order.payment


# ── Webhook Алиф (skeleton — заполнить когда получим ключи) ────
@router.post("/webhook/alif")
async def alif_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Заглушка для webhook Алифа.
    Когда получим договор — реализовать:
    1. Проверить подпись запроса (HMAC)
    2. Найти заказ по provider_ref
    3. Обновить статус платежа
    4. Обновить order.is_paid = True
    """
    body = await request.json()
    order_ref = body.get("order_id") or body.get("merchant_order_id")
    status    = body.get("status")
    txn_id    = body.get("transaction_id") or body.get("uid")

    if not order_ref:
        return {"ok": False, "detail": "no order_ref"}

    payment = db.query(Payment).filter(Payment.provider_ref == str(order_ref)).first()
    if not payment:
        return {"ok": False, "detail": "payment not found"}

    payment.provider_data = body
    if status in ("successful", "completed", "paid"):
        payment.status = PaymentStatus.paid
        payment.provider_ref = txn_id or order_ref
        order = db.query(Order).filter(Order.id == payment.order_id).first()
        if order:
            order.is_paid = True
            order.status = OrderStatus.confirmed
    elif status in ("failed", "error"):
        payment.status = PaymentStatus.failed

    db.commit()
    return {"ok": True}


# ── Инициировать оплату через Алиф (skeleton) ─────────────────
@router.post("/order/{order_id}/pay/alif")
def pay_with_alif(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Заглушка для оплаты через Алиф.
    Когда получим ключи — реализовать:
    1. Создать запрос к Алиф API
    2. Получить payment_url
    3. Вернуть url для редиректа/WebView
    """
    order = db.query(Order).filter(Order.id == order_id, Order.buyer_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return {
        "ok": False,
        "message": "Оплата через Алиф будет доступна после подключения. Используйте оплату при получении.",
        "payment_url": None,
    }
