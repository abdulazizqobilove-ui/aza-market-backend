from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User, UserRole
from app.models.seller_application import SellerApplication, ApplicationStatus
from app.models.notification import Notification
from datetime import datetime
import os, uuid, shutil
from app.core.config import settings

router = APIRouter(prefix="/seller-applications", tags=["seller-applications"])


class ApplicationCreate(BaseModel):
    shop_name: str
    description: Optional[str] = None


def _upload_reg_doc(file: UploadFile) -> str:
    from app.core.upload import upload_image as cloud_upload
    try:
        return cloud_upload(file, folder="reg_docs")
    except Exception:
        ext = os.path.splitext(file.filename or "doc.jpg")[1] or ".jpg"
        filename = f"regdoc_{uuid.uuid4().hex}{ext}"
        dest = os.path.join(settings.UPLOAD_DIR, filename)
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        return f"/uploads/{filename}"


class ApplicationOut(BaseModel):
    id: int
    user_id: int
    shop_name: str
    description: Optional[str]
    status: ApplicationStatus
    admin_comment: Optional[str]
    registration_doc_url: Optional[str] = None
    created_at: datetime
    username: Optional[str] = None
    phone: Optional[str] = None

    model_config = {"from_attributes": True}


class ApplicationReview(BaseModel):
    status: ApplicationStatus
    admin_comment: Optional[str] = None


@router.post("", response_model=ApplicationOut, status_code=201)
def submit_application(
    shop_name: str = Form(...),
    description: Optional[str] = Form(None),
    registration_doc: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == UserRole.seller:
        raise HTTPException(status_code=400, detail="Вы уже продавец")
    if user.role == UserRole.admin:
        raise HTTPException(status_code=400, detail="Admins cannot apply")

    existing = db.query(SellerApplication).filter(
        SellerApplication.user_id == user.id,
        SellerApplication.status == ApplicationStatus.pending,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Заявка уже отправлена")

    reg_doc_url = None
    if registration_doc and registration_doc.filename:
        reg_doc_url = _upload_reg_doc(registration_doc)

    app = SellerApplication(
        user_id=user.id,
        shop_name=shop_name,
        description=description,
        registration_doc_url=reg_doc_url,
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    result = ApplicationOut.model_validate(app)
    result.username = user.username
    result.phone = user.phone
    return result


@router.get("/my", response_model=Optional[ApplicationOut])
def my_application(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app = db.query(SellerApplication).filter(
        SellerApplication.user_id == user.id,
    ).order_by(SellerApplication.created_at.desc()).first()
    if not app:
        return None
    result = ApplicationOut.model_validate(app)
    result.username = user.username
    result.phone = user.phone
    return result


@router.get("", response_model=List[ApplicationOut])
def list_applications(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    apps = db.query(SellerApplication).order_by(SellerApplication.created_at.desc()).all()
    out = []
    for app in apps:
        u = db.query(User).filter(User.id == app.user_id).first()
        item = ApplicationOut.model_validate(app)
        if u:
            item.username = u.username
            item.phone = u.phone
        out.append(item)
    return out


@router.patch("/{application_id}", response_model=ApplicationOut)
def review_application(
    application_id: int,
    data: ApplicationReview,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    app = db.query(SellerApplication).filter(SellerApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if app.status != ApplicationStatus.pending:
        raise HTTPException(status_code=400, detail="Заявка уже обработана")

    app.status = data.status
    app.admin_comment = data.admin_comment

    user = db.query(User).filter(User.id == app.user_id).first()
    if data.status == ApplicationStatus.approved and user:
        user.role = UserRole.seller
        db.add(Notification(
            user_id=user.id,
            title="Заявка одобрена!",
            body=f"Поздравляем! Ваш магазин «{app.shop_name}» одобрен. Теперь вы можете добавлять товары.",
        ))
    elif data.status == ApplicationStatus.rejected and user:
        db.add(Notification(
            user_id=user.id,
            title="Заявка отклонена",
            body=data.admin_comment or "Ваша заявка на продавца была отклонена.",
        ))

    db.commit()
    db.refresh(app)

    result = ApplicationOut.model_validate(app)
    if user:
        result.username = user.username
        result.phone = user.phone
    return result
