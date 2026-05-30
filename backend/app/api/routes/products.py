from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, text as sa_text
from typing import List, Optional
import os, uuid, shutil, json
import httpx, math
from app.core.database import get_db
from app.core.config import settings
from app.core.upload import upload_image as cloud_upload
from app.api.deps import get_current_user, require_seller
from app.models.product import Product, Category, ProductImage
from app.models.user import User
from app.models.waitlist import Waitlist
from app.models.notification import Notification
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductListOut, CategoryOut

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.parent_id == None).all()


@router.get("/categories/{cat_id}/subcategories", response_model=List[CategoryOut])
def get_subcategories(cat_id: int, db: Session = Depends(get_db)):
    subs = db.query(Category).filter(Category.parent_id == cat_id).all()
    result = []
    for sub in subs:
        # Attach representative image from first active product in this subcategory
        img_row = (
            db.query(ProductImage.url)
            .join(Product, Product.id == ProductImage.product_id)
            .filter(Product.category_id == sub.id, Product.is_active == True, ProductImage.is_main == True)
            .first()
        )
        if not img_row:
            img_row = (
                db.query(ProductImage.url)
                .join(Product, Product.id == ProductImage.product_id)
                .filter(Product.category_id == sub.id, Product.is_active == True)
                .first()
            )
        cat_out = CategoryOut(
            id=sub.id, name=sub.name, slug=sub.slug, parent_id=sub.parent_id,
            image_url=sub.image_url if sub.image_url else (img_row[0] if img_row else None),
        )
        result.append(cat_out)
    return result


@router.get("", response_model=dict)
def list_products(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    brand: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
    sort: str = Query("popular", enum=["popular", "newest", "price_asc", "price_desc", "rating"]),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
        joinedload(Product.seller),
    ).filter(Product.is_active == True)

    if q:
        query = query.filter(or_(
            Product.title.ilike(f"%{q}%"),
            Product.brand.ilike(f"%{q}%"),
        ))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if brand:
        query = query.filter(Product.brand.ilike(f"%{brand}%"))
    if min_rating is not None:
        query = query.filter(Product.rating >= min_rating)

    sort_map = {
        # score = продажи*0.6 + рейтинг*6 + свежесть за 30 дней +5
        "popular": sa_text(
            "COALESCE(mkt_products.sales_count,0)*0.6 + COALESCE(mkt_products.rating,0)*6.0 "
            "+ CASE WHEN mkt_products.created_at > NOW() - INTERVAL '30 days' THEN 5 ELSE 0 END DESC"
        ),
        "newest": Product.created_at.desc(),
        "price_asc": Product.price.asc(),
        "price_desc": Product.price.desc(),
        "rating": Product.rating.desc(),
    }
    query = query.order_by(sort_map[sort])

    total = query.count()
    products = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "items": [ProductListOut.model_validate(p) for p in products],
    }


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(Product.id == product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=ProductOut, status_code=201)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    category = db.query(Category).filter(Category.id == data.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    product = Product(**data.model_dump(), seller_id=seller.id)
    db.add(product)
    db.commit()
    db.refresh(product)
    return db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(Product.id == product.id).first()


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    was_out_of_stock = product.stock == 0
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(product, field, value)

    # Уведомить пользователей из листа ожидания если товар появился в наличии
    if was_out_of_stock and product.stock > 0:
        waitlist_users = db.query(Waitlist).filter(Waitlist.product_id == product_id).all()
        for w in waitlist_users:
            db.add(Notification(
                user_id=w.user_id,
                title="Товар появился в наличии",
                body=f"«{product.title}» снова доступен для заказа",
            ))

    db.commit()
    db.refresh(product)
    return db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(Product.id == product.id).first()


@router.patch("/{product_id}/toggle", response_model=ProductOut)
def toggle_product_active(
    product_id: int,
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = not product.is_active
    db.commit()
    db.refresh(product)
    return db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(Product.id == product.id).first()


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()


@router.post("/{product_id}/images", response_model=ProductOut)
def upload_images(
    product_id: int,
    files: List[UploadFile] = File(...),
    variant_indices: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    product = db.query(Product).filter(Product.id == product_id, Product.seller_id == seller.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    indices: List[Optional[int]] = []
    if variant_indices:
        try:
            indices = json.loads(variant_indices)
        except Exception:
            indices = []

    has_main = bool(product.images)
    for i, file in enumerate(files):
        url = cloud_upload(file, folder="products")
        is_main = not has_main and i == 0
        vi = indices[i] if i < len(indices) else None
        db.add(ProductImage(product_id=product.id, url=url, is_main=is_main, variant_index=vi))
        has_main = True
    db.commit()

    return db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images),
    ).filter(Product.id == product.id).first()


# ─── Bulk create ────────────────────────────────────────────────────────────

@router.post("/bulk", status_code=201)
def bulk_create_products(
    products: List[ProductCreate],
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    """Create multiple products at once (catalog import)."""
    if len(products) > 200:
        raise HTTPException(status_code=400, detail="Максимум 200 товаров за раз")

    created_ids = []
    for data in products:
        category = db.query(Category).filter(Category.id == data.category_id).first()
        if not category:
            continue
        product = Product(**data.model_dump(), seller_id=seller.id)
        db.add(product)
        db.flush()
        created_ids.append(product.id)

    db.commit()
    return {"created": len(created_ids), "ids": created_ids}


# ─── WB / Ozon import preview ───────────────────────────────────────────────

def _wb_photo_host(vol: int) -> str:
    buckets = [
        (143,"01"),(287,"02"),(431,"03"),(719,"04"),(1007,"05"),
        (1061,"06"),(1115,"07"),(1169,"08"),(1313,"09"),(1601,"10"),
        (1655,"11"),(1709,"12"),(2045,"13"),(2189,"14"),(2405,"15"),
        (2621,"16"),(2837,"17"),(3053,"18"),(3269,"19"),(3485,"20"),
        (3701,"21"),(3917,"22"),(4133,"23"),(4349,"24"),
    ]
    for threshold, bucket in buckets:
        if vol <= threshold:
            return f"https://basket-{bucket}.wbbasket.ru"
    return "https://basket-25.wbbasket.ru"


@router.get("/import/wb/{article}")
async def import_wb_product(article: str):
    """Fetch WB product data for preview before import."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm={article}",
                headers={"User-Agent": "Mozilla/5.0"}
            )
        data = r.json()
        products = data.get("data", {}).get("products", [])
        if not products:
            raise HTTPException(status_code=404, detail="Товар не найден на Wildberries")

        p = products[0]
        pid = p["id"]
        vol = math.floor(pid / 100000)
        part = math.floor(pid / 1000)
        host = _wb_photo_host(vol)
        pics = p.get("pics", 0)
        photos = [
            f"{host}/vol{vol}/part{part}/{pid}/images/c516x688/{n}.jpg"
            for n in range(1, min(pics, 8) + 1)
        ]
        price_u = p.get("salePriceU") or p.get("priceU") or 0
        return {
            "wb_id": pid,
            "title": p.get("name", ""),
            "brand": p.get("brand", ""),
            "price": round(price_u / 100),
            "photos": photos,
            "description": "",
            "stock": 10,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка WB: {str(e)}")


@router.get("/import/ozon/{article}")
async def import_ozon_product(article: str):
    """Fetch Ozon product data by article for preview."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://www.ozon.ru/api/entrypoint-api.bx/page/json/v2?url=/product/{article}/",
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "application/json"}
            )
        data = r.json()
        widgets = data.get("widgetStates", {})
        title, price, brand, photos = "", 0, "", []

        for key, val in widgets.items():
            if "webProductHeading" in key:
                try:
                    obj = json.loads(val)
                    title = obj.get("title", "")
                    b = obj.get("brand")
                    brand = b.get("name", "") if isinstance(b, dict) else ""
                except Exception:
                    pass
            if "webGallery" in key:
                try:
                    obj = json.loads(val)
                    for img in obj.get("images", [])[:8]:
                        u = img.get("original") or img.get("url") or ""
                        if u:
                            photos.append(u)
                except Exception:
                    pass
            if "webPrice" in key and not price:
                try:
                    obj = json.loads(val)
                    raw = obj.get("price", "0").replace(" ","").replace("₽","").replace(",",".")
                    price = int(float(raw)) if raw else 0
                except Exception:
                    pass

        if not title:
            raise HTTPException(status_code=404, detail="Товар не найден на Ozon")

        return {"ozon_article": article, "title": title, "brand": brand, "price": price, "photos": photos, "description": "", "stock": 10}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка Ozon: {str(e)}")
