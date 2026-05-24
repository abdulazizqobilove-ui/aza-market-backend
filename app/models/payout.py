from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class PayoutStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Payout(Base):
    __tablename__ = "mkt_payouts"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("mkt_users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    bank_details = Column(Text, nullable=False)
    status = Column(Enum(PayoutStatus), default=PayoutStatus.pending, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    seller = relationship("User", back_populates="payouts")
