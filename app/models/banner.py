from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Banner(Base):
    __tablename__ = "mkt_banners"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    subtitle = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    bg_color = Column(String, default="#1d4ed8")
    accent_color = Column(String, default="#93c5fd")
    emoji = Column(String, nullable=True)
    link_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
