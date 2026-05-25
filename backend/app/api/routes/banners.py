from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.upload import upload_image as cloud_upload
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


class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    bg_color: Optional[str] = None
    accent_color: Optional[str] = None
    emoji: Optional[str] = None
    link_url: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("", response_model=List[BannerOut])
def get_banners(db: Session = Depends(get_db)):
    return db.query(Banner).filter(Banner.is_active == True).order_by(Banner.sort_order, Banner.id).all()


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
    if image and image.filename:
        try:
            image_url = cloud_upload(image, folder="banners")
        except Exception:
            pass

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
    data: BannerUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(banner, field, value)

    db.commit()
    db.refresh(banner)
    return banner


@router.post("/{banner_id}/image", response_model=BannerOut)
def upload_banner_image(
    banner_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")

    try:
        banner.image_url = cloud_upload(file, folder="banners")
    except Exception:
        raise HTTPException(status_code=500, detail="Supabase не настроен — добавьте SUPABASE_URL и SUPABASE_SERVICE_KEY в Render")
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
