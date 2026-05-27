from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Category(Base):
    __tablename__ = "mkt_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    parent_id = Column(Integer, ForeignKey("mkt_categories.id"), nullable=True)

    parent = relationship("Category", remote_side=[id], back_populates="children")
    children = relationship("Category", back_populates="parent")
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "mkt_products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text)
    price = Column(Float, nullable=False)
    original_price = Column(Float)
    stock = Column(Integer, default=0)
    sku = Column(String, nullable=True)
    brand = Column(String)
    rating = Column(Float, default=0.0)
    reviews_count = Column(Integer, default=0)
    sales_count = Column(Integer, default=0, nullable=False, server_default=text("0"))
    is_active = Column(Boolean, default=True, server_default=text("true"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    seller_id = Column(Integer, ForeignKey("mkt_users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("mkt_categories.id"), nullable=False)

    about = Column(Text, nullable=True)
    attributes = Column(JSONB, nullable=True, default=dict, server_default=text("'{}'::jsonb"))
    variants = Column(JSONB, nullable=True, default=None)

    seller = relationship("User", back_populates="products")
    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")
    cart_items = relationship("CartItem", back_populates="product")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="product", cascade="all, delete-orphan")
    waitlist = relationship("Waitlist", back_populates="product", cascade="all, delete-orphan")


class ProductImage(Base):
    __tablename__ = "mkt_product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("mkt_products.id"), nullable=False)
    url = Column(String, nullable=False)
    is_main = Column(Boolean, default=False)
    variant_index = Column(Integer, nullable=True)

    product = relationship("Product", back_populates="images")
