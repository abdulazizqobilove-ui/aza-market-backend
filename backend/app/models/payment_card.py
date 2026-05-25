from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class PaymentCard(Base):
    __tablename__ = "mkt_payment_cards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("mkt_users.id"), nullable=False)
    last4 = Column(String(4), nullable=False)
    card_holder = Column(String, nullable=False)
    expiry = Column(String(5), nullable=False)  # MM/YY
    card_type = Column(String, nullable=False, default="visa")  # visa, mastercard, uzcard, humo
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="payment_cards")
