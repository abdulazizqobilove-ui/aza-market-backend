from sqlalchemy import Column, Integer, String, Text, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class FeedbackType(str, enum.Enum):
    suggestion = "suggestion"   # Предложение
    bug        = "bug"          # Ошибка/баг
    question   = "question"     # Вопрос
    complaint  = "complaint"    # Жалоба


class FeedbackStatus(str, enum.Enum):
    new       = "new"       # Новое (непрочитанное)
    read      = "read"      # Прочитано
    replied   = "replied"   # Ответили
    done      = "done"      # Решено


class Feedback(Base):
    __tablename__ = "mkt_feedback"

    id         = Column(Integer, primary_key=True, index=True)
    seller_id  = Column(Integer, ForeignKey("mkt_users.id"), nullable=False)
    type       = Column(Enum(FeedbackType), nullable=False, default=FeedbackType.suggestion)
    title      = Column(String(200), nullable=False)
    message    = Column(Text, nullable=False)
    status     = Column(Enum(FeedbackStatus), nullable=False, default=FeedbackStatus.new)
    admin_reply = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    seller = relationship("User", foreign_keys=[seller_id])
