from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Waitlist(Base):
    __tablename__ = "mkt_waitlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("mkt_users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("mkt_products.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="waitlist")
    product = relationship("Product", back_populates="waitlist")
