from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text, Boolean, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"


class Order(Base):
    __tablename__ = "mkt_orders"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("mkt_users.id"), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.pending, nullable=False)
    total_price = Column(Float, nullable=False)
    delivery_address = Column(Text, nullable=False)
    delivery_city = Column(String, nullable=False)
    contact_phone = Column(String, nullable=False)
    payment_method = Column(String, default="cash", nullable=False)
    is_paid = Column(Boolean, default=False, nullable=False)
    delivery_date = Column(String, nullable=True)
    delivery_time = Column(String, nullable=True)
    delivery_cost = Column(Float, default=0.0, nullable=False, server_default=text("0"))
    delivery_service = Column(String, nullable=True)   # sesamt | apost | other
    tracking_number = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    buyer = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False)


class OrderItem(Base):
    __tablename__ = "mkt_order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("mkt_orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("mkt_products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
