from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class ReportType(str, enum.Enum):
    product = "product"
    user = "user"


class ReportStatus(str, enum.Enum):
    pending = "pending"
    resolved = "resolved"
    dismissed = "dismissed"


class Report(Base):
    __tablename__ = "mkt_reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("mkt_users.id"), nullable=False)
    type = Column(SAEnum(ReportType), nullable=False)
    target_id = Column(Integer, nullable=False)  # product_id or user_id
    reason = Column(String, nullable=False)
    comment = Column(String, nullable=True)
    status = Column(SAEnum(ReportStatus), default=ReportStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reporter = relationship("User", foreign_keys=[reporter_id])
