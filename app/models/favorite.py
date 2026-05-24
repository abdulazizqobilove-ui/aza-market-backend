from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Favorite(Base):
    __tablename__ = "mkt_favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("mkt_users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("mkt_products.id"), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "product_id"),)

    user = relationship("User", back_populates="favorites")
    product = relationship("Product", back_populates="favorites")
