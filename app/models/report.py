import enum
from sqlalchemy import Column, Integer, String, Text, Enum, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ReportType(str, enum.Enum):
    product = "product"
    seller = "seller"
    review = "review"


class ReportStatus(str, enum.Enum):
    new = "new"
    reviewed = "reviewed"
    resolved = "resolved"
    dismissed = "dismissed"


class Report(Base):
    __tablename__ = "mkt_reports"

    id = Column(Integer, primary_key=True)
    reporter_id = Column(Integer, ForeignKey("mkt_users.id"), nullable=True)
    type = Column(Enum(ReportType), nullable=False)
    target_id = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Enum(ReportStatus), default=ReportStatus.new)
    admin_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reporter = relationship("User", foreign_keys=[reporter_id])
