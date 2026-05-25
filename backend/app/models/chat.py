from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Chat(Base):
    __tablename__ = "mkt_chats"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("mkt_users.id"), nullable=False)
    seller_id = Column(Integer, ForeignKey("mkt_users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("mkt_products.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    buyer = relationship("User", foreign_keys=[buyer_id])
    seller = relationship("User", foreign_keys=[seller_id])
    product = relationship("Product")
    messages = relationship("Message", back_populates="chat", order_by="Message.created_at", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "mkt_messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("mkt_chats.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("mkt_users.id"), nullable=False)
    text = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chat = relationship("Chat", back_populates="messages")
    sender = relationship("User")
