from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    buyer = "buyer"
    seller = "seller"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    full_name = Column(String)
    phone = Column(String, unique=True, index=True)
    role = Column(Enum(UserRole), default=UserRole.buyer, nullable=False)
    is_active = Column(Boolean, default=True)
    balance = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Shop profile
    shop_name = Column(String, nullable=True)
    shop_description = Column(String, nullable=True)
    shop_banner_url = Column(String, nullable=True)
    shop_logo_url = Column(String, nullable=True)

    products = relationship("Product", back_populates="seller")
    orders = relationship("Order", back_populates="buyer")
    cart_items = relationship("CartItem", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    favorites = relationship("Favorite", back_populates="user")
    payouts = relationship("Payout", back_populates="seller")
    waitlist = relationship("Waitlist", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    seller_applications = relationship("SellerApplication", back_populates="user")
