from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Review(Base):
    __tablename__ = "mkt_reviews"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("mkt_products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("mkt_users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (CheckConstraint("rating >= 1 AND rating <= 5"),)

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
