from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.payout import PayoutStatus


class PayoutCreate(BaseModel):
    amount: float = Field(..., gt=0)
    bank_details: str = Field(..., min_length=5)


class PayoutOut(BaseModel):
    id: int
    amount: float
    bank_details: str
    status: PayoutStatus
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SellerBalanceOut(BaseModel):
    balance: float
    total_earned: float
    total_withdrawn: float
    payouts: list[PayoutOut] = []
