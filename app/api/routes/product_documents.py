from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import os, uuid, shutil
from app.core.database import get_db
from app.api.deps import require_seller
from app.models.product import Product
from app.models.product_document import ProductDocument
from app.models.user import User
from app.schemas.product import ProductDocumentOut
from app.core.config import settings

router = APIRouter(prefix="/products", tags=["product-documents"])

DOC_TYPES = {"certificate", "invoice", "other"}


def _upload_doc(file: UploadFile) -> str:
    from app.core.upload import upload_image as cloud_upload
    try:
        return cloud_upload(file, folder="product_docs")
    except Exception:
        ext = os.path.splitext(file.filename or "doc.jpg")[1] or ".jpg"
        filename = f"doc_{uuid.uuid4().hex}{ext}"
        dest = os.path.join(settings.UPLOAD_DIR, filename)
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        return f"/uploads/{filename}"


@router.get("/{product_id}/documents", response_model=List[ProductDocumentOut])
def get_documents(product_id: int, db: Session = Depends(get_db)):
    return db.query(ProductDocument).filter(ProductDocument.product_id == product_id).all()


@router.post("/{product_id}/documents", response_model=ProductDocumentOut, status_code=201)
def upload_document(
    product_id: int,
    doc_type: str = Form("other"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if doc_type not in DOC_TYPES:
        doc_type = "other"

    url = _upload_doc(file)
    doc = ProductDocument(product_id=product_id, doc_type=doc_type, url=url, filename=file.filename)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{product_id}/documents/{doc_id}", status_code=204)
def delete_document(
    product_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    doc = db.query(ProductDocument).filter(ProductDocument.id == doc_id, ProductDocument.product_id == product_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
