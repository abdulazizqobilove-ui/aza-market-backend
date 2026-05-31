from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.api.deps import require_seller, require_admin
from app.models.user import User
from app.models.feedback import Feedback, FeedbackType, FeedbackStatus

router = APIRouter(prefix="/feedback", tags=["feedback"])


# ── Schemas ────────────────────────────────────────────────────
class FeedbackCreate(BaseModel):
    type: FeedbackType
    title: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)


class FeedbackOut(BaseModel):
    id: int
    type: FeedbackType
    title: str
    message: str
    status: FeedbackStatus
    admin_reply: Optional[str] = None
    created_at: str
    seller_name: Optional[str] = None
    seller_phone: Optional[str] = None
    seller_shop: Optional[str] = None

    class Config:
        from_attributes = True


class AdminReply(BaseModel):
    reply: Optional[str] = None
    status: FeedbackStatus


# ── Seller endpoints ───────────────────────────────────────────

@router.post("", status_code=201)
def create_feedback(
    body: FeedbackCreate,
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    fb = Feedback(
        seller_id=seller.id,
        type=body.type,
        title=body.title.strip(),
        message=body.message.strip(),
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return {"id": fb.id, "message": "Спасибо! Ваше сообщение отправлено."}


@router.get("/my", response_model=List[FeedbackOut])
def my_feedback(
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    items = db.query(Feedback).filter(Feedback.seller_id == seller.id).order_by(Feedback.created_at.desc()).all()
    return [_to_out(fb) for fb in items]


# ── Admin endpoints ────────────────────────────────────────────

@router.get("/admin/all", response_model=List[FeedbackOut])
def admin_list_feedback(
    status: Optional[FeedbackStatus] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = db.query(Feedback).order_by(Feedback.created_at.desc())
    if status:
        q = q.filter(Feedback.status == status)
    return [_to_out(fb) for fb in q.all()]


@router.patch("/admin/{feedback_id}")
def admin_update_feedback(
    feedback_id: int,
    body: AdminReply,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Не найдено")
    fb.status = body.status
    if body.reply is not None:
        fb.admin_reply = body.reply.strip() or None
    db.commit()
    return {"ok": True}


# ── Helper ─────────────────────────────────────────────────────
def _to_out(fb: Feedback) -> FeedbackOut:
    return FeedbackOut(
        id=fb.id,
        type=fb.type,
        title=fb.title,
        message=fb.message,
        status=fb.status,
        admin_reply=fb.admin_reply,
        created_at=fb.created_at.isoformat() if fb.created_at else "",
        seller_name=fb.seller.full_name if fb.seller else None,
        seller_phone=fb.seller.phone if fb.seller else None,
        seller_shop=fb.seller.shop_name if fb.seller else None,
    )
