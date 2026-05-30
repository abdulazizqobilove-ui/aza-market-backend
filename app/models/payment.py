from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class PaymentMethod(str, enum.Enum):
    cod    = "cod"    # Оплата при получении
    alif   = "alif"  # Алиф (будущее)
    card   = "card"  # Карта (будущее)


class PaymentStatus(str, enum.Enum):
    pending   = "pending"    # Ожидает
    paid      = "paid"       # Оплачено
    failed    = "failed"     # Ошибка
    cancelled = "cancelled"  # Отменено
    refunded  = "refunded"   # Возврат


class Payment(Base):
    __tablename__ = "mkt_payments"

    id           = Column(Integer, primary_key=True, index=True)
    order_id     = Column(Integer, ForeignKey("mkt_orders.id"), nullable=False, unique=True)
    amount       = Column(Float, nullable=False)
    currency     = Column(String, default="TJS", nullable=False)
    method       = Column(Enum(PaymentMethod), nullable=False)
    status       = Column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)
    provider_ref = Column(String, nullable=True)   # ID транзакции у Алифа
    provider_data = Column(JSONB, nullable=True)   # Полные данные от Алифа
    note         = Column(Text, nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    order = relationship("Order", back_populates="payment")
