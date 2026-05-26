import uuid
import requests
from fastapi import UploadFile, HTTPException
from app.core.config import settings


def upload_image(file: UploadFile, folder: str = "imgs") -> str:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Storage not configured")

    ext = (file.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    path = f"{folder}/{uuid.uuid4()}.{ext}"

    url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_BUCKET}/{path}"

    file.file.seek(0)
    data = file.file.read()

    resp = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_KEY,
            "Content-Type": f"image/{ext}",
            "x-upsert": "true",
        },
        data=data,
    )

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail=f"Upload failed: {resp.text}")

    return f"{settings.SUPABASE_URL}/storage/v1/object/public/{settings.SUPABASE_BUCKET}/{path}"
