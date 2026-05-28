from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import os, uuid, shutil

from app.core.database import get_db
from app.core.config import settings
from app.api.deps import require_admin
from app.models.banner import Banner
from app.models.user import User

router = APIRouter(prefix="/banners", tags=["banners"])


class BannerOut(BaseModel):
    id: int
    title: str
    subtitle: Optional[str]
    image_url: Optional[str]
    bg_color: str
    accent_color: str
    emoji: Optional[str]
    link_url: Optional[str]
    is_active: bool
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=List[BannerOut])
def get_banners(db: Session = Depends(get_db)):
    # Главный экран — только баннеры без link_url (категорийные баннеры не показываем)
    return (
        db.query(Banner)
        .filter(Banner.is_active == True)
        .filter((Banner.link_url == None) | (~Banner.link_url.like("category:%")))
        .order_by(Banner.sort_order, Banner.id)
        .all()
    )


@router.get("/all", response_model=List[BannerOut])
def get_all_banners(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return db.query(Banner).order_by(Banner.sort_order, Banner.id).all()


@router.post("", response_model=BannerOut, status_code=201)
def create_banner(
    title: str = Form(...),
    subtitle: Optional[str] = Form(None),
    bg_color: str = Form("#1d4ed8"),
    accent_color: str = Form("#93c5fd"),
    emoji: Optional[str] = Form(None),
    link_url: Optional[str] = Form(None),
    sort_order: int = Form(0),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    image_url = None
    if image:
        ext = os.path.splitext(image.filename or "banner.jpg")[1] or ".jpg"
        fname = f"banner_{uuid.uuid4().hex}{ext}"
        path = os.path.join(settings.UPLOAD_DIR, fname)
        with open(path, "wb") as f:
            shutil.copyfileobj(image.file, f)
        image_url = f"/uploads/{fname}"

    banner = Banner(
        title=title, subtitle=subtitle, image_url=image_url,
        bg_color=bg_color, accent_color=accent_color,
        emoji=emoji, link_url=link_url, sort_order=sort_order,
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return banner


@router.patch("/{banner_id}", response_model=BannerOut)
def update_banner(
    banner_id: int,
    title: Optional[str] = Form(None),
    subtitle: Optional[str] = Form(None),
    bg_color: Optional[str] = Form(None),
    accent_color: Optional[str] = Form(None),
    emoji: Optional[str] = Form(None),
    link_url: Optional[str] = Form(None),
    sort_order: Optional[int] = Form(None),
    is_active: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")

    if title is not None: banner.title = title
    if subtitle is not None: banner.subtitle = subtitle
    if bg_color is not None: banner.bg_color = bg_color
    if accent_color is not None: banner.accent_color = accent_color
    if emoji is not None: banner.emoji = emoji
    if link_url is not None: banner.link_url = link_url
    if sort_order is not None: banner.sort_order = sort_order
    if is_active is not None: banner.is_active = is_active

    if image:
        ext = os.path.splitext(image.filename or "banner.jpg")[1] or ".jpg"
        fname = f"banner_{uuid.uuid4().hex}{ext}"
        path = os.path.join(settings.UPLOAD_DIR, fname)
        with open(path, "wb") as f:
            shutil.copyfileobj(image.file, f)
        banner.image_url = f"/uploads/{fname}"

    db.commit()
    db.refresh(banner)
    return banner


@router.delete("/{banner_id}", status_code=204)
def delete_banner(banner_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    db.delete(banner)
    db.commit()
