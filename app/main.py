from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.core.database import Base, engine
from app.core.config import settings
from app.api.routes import auth, products, cart, orders, seller, users, reviews, favorites, admin, waitlist, notifications, seller_applications, shop

Base.metadata.create_all(bind=engine)

# Add missing columns to existing tables (safe migration)
def _migrate():
    from sqlalchemy import text
    with engine.connect() as conn:
        migrations = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS balance FLOAT NOT NULL DEFAULT 0.0",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_name VARCHAR",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_description VARCHAR",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_banner_url VARCHAR",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_logo_url VARCHAR",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR",
        ]
        for sql in migrations:
            try:
                conn.execute(text(sql))
            except Exception:
                pass
        conn.commit()

_migrate()

# Auto-seed categories and users if empty
def _seed():
    from app.core.database import SessionLocal
    from app.models.product import Category
    from app.models.user import User, UserRole
    db = SessionLocal()
    try:
        if db.query(Category).count() == 0:
            cats = [
                ("Электроника", "electronics"), ("Одежда", "clothing"),
                ("Дом и сад", "home-garden"), ("Спорт", "sport"),
                ("Красота и здоровье", "beauty"), ("Детские товары", "kids"),
                ("Продукты", "food"), ("Авто", "auto"),
            ]
            for name, slug in cats:
                db.add(Category(name=name, slug=slug))
            db.commit()

        if not db.query(User).filter(User.phone == "+992777777777").first():
            db.add(User(phone="+992777777777", username="admin", full_name="Администратор", role=UserRole.admin))
            db.commit()

        if not db.query(User).filter(User.phone == "+992666666666").first():
            db.add(User(phone="+992666666666", username="demo_seller", full_name="Демо Продавец", role=UserRole.seller,
                        shop_name="Демо Магазин"))
            db.commit()
    except: pass
    finally: db.close()

_seed()

app = FastAPI(title="Marketplace API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(seller.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")
app.include_router(favorites.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(waitlist.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(seller_applications.router, prefix="/api")
app.include_router(shop.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
