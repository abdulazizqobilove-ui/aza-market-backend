import cloudinary
import cloudinary.uploader
from fastapi import UploadFile
from app.core.config import settings


def _configure():
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_image(file: UploadFile, folder: str = "marketplace") -> str:
    """Upload file to Cloudinary, return public URL."""
    _configure()
    result = cloudinary.uploader.upload(
        file.file,
        folder=folder,
        resource_type="image",
    )
    return result["secure_url"]
