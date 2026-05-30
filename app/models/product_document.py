from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class ProductDocument(Base):
    __tablename__ = "mkt_product_documents"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("mkt_products.id", ondelete="CASCADE"), nullable=False)
    doc_type = Column(String, nullable=False)   # certificate | invoice | other
    url = Column(String, nullable=False)
    filename = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="documents")
