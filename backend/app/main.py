from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.core.database import Base, engine
from app.core.config import settings
from app.api.routes import auth, products, cart, orders, seller, users, reviews, favorites, admin, waitlist, notifications, seller_applications, shop, banners, chats
from app.models import payment_card, chat  # ensure tables are created

Base.metadata.create_all(bind=engine)

# Migrations — each in its own try/except so one failure doesn't block the rest
from sqlalchemy import text as _sql, inspect as _inspect
_existing_review_cols = [c["name"] for c in _inspect(engine).get_columns("mkt_reviews")]
_existing_user_cols = [c["name"] for c in _inspect(engine).get_columns("mkt_users")]
_existing_product_cols = [c["name"] for c in _inspect(engine).get_columns("mkt_products")]
_existing_banner_cols = [c["name"] for c in _inspect(engine).get_columns("mkt_banners")]
for _stmt in (
    [] if "images" in _existing_review_cols else
    ["ALTER TABLE mkt_reviews ADD COLUMN images JSONB DEFAULT '[]'"]
) + (
    [] if "avatar_url" in _existing_user_cols else
    ["ALTER TABLE mkt_users ADD COLUMN avatar_url VARCHAR"]
) + (
    [] if "push_token" in _existing_user_cols else
    ["ALTER TABLE mkt_users ADD COLUMN push_token VARCHAR"]
) + (
    [] if "sales_count" in _existing_product_cols else
    ["ALTER TABLE mkt_products ADD COLUMN sales_count INTEGER NOT NULL DEFAULT 0"]
) + (
    [] if "about" in _existing_product_cols else
    ["ALTER TABLE mkt_products ADD COLUMN about TEXT"]
) + (
    [] if "attributes" in _existing_product_cols else
    ["ALTER TABLE mkt_products ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb"]
) + (
    [] if "shop_name" in _existing_user_cols else
    ["ALTER TABLE mkt_users ADD COLUMN shop_name VARCHAR"]
) + (
    [] if "shop_description" in _existing_user_cols else
    ["ALTER TABLE mkt_users ADD COLUMN shop_description VARCHAR"]
) + (
    [] if "shop_banner_url" in _existing_user_cols else
    ["ALTER TABLE mkt_users ADD COLUMN shop_banner_url VARCHAR"]
) + (
    [] if "shop_logo_url" in _existing_user_cols else
    ["ALTER TABLE mkt_users ADD COLUMN shop_logo_url VARCHAR"]
) + (
    [] if "link_url" in _existing_banner_cols else
    ["ALTER TABLE mkt_banners ADD COLUMN link_url VARCHAR"]
) + (
    [] if "image_url" in _existing_banner_cols else
    ["ALTER TABLE mkt_banners ADD COLUMN image_url VARCHAR"]
) + (
    [] if "sku" in _existing_product_cols else
    ["ALTER TABLE mkt_products ADD COLUMN sku VARCHAR"]
):
    try:
        with engine.begin() as _conn:
            _conn.execute(_sql(_stmt))
    except Exception:
        pass

# Auto-seed categories and users if empty
def _seed():
    from app.core.database import SessionLocal
    from app.models.product import Category
    from app.models.user import User, UserRole
    db = SessionLocal()
    try:
        # Seed root categories
        if db.query(Category).filter(Category.parent_id == None).count() == 0:
            roots = [
                ("Электроника", "electronics"), ("Одежда", "clothing"),
                ("Обувь", "shoes"), ("Аксессуары", "accessories"),
                ("Дом и сад", "home-garden"), ("Мебель", "furniture"),
                ("Строительство и ремонт", "construction"), ("Спорт и отдых", "sport"),
                ("Красота и уход", "beauty"), ("Здоровье", "health"),
                ("Детские товары", "kids"), ("Автотовары", "auto"),
                ("Продукты питания", "food"), ("Бытовая химия", "household-chem"),
                ("Зоотовары", "pets"), ("Хобби и творчество", "hobby"),
                ("Канцтовары", "stationery"), ("Книги", "books"),
                ("Дача, сад и огород", "garden"),
            ]
            for name, slug in roots:
                db.add(Category(name=name, slug=slug))
            db.commit()

        # Seed subcategories (runs independently — safe to add even if roots exist)
        if db.query(Category).filter(Category.parent_id != None).count() == 0:
            subcats = {
                "electronics": [
                    ("Смартфоны", "smartphones"), ("Ноутбуки и ПК", "laptops"),
                    ("Планшеты", "tablets"), ("Наушники и аудио", "audio"),
                    ("Телевизоры", "tvs"), ("Фото и видео", "photo"),
                    ("Умные часы", "smartwatches"), ("Игровые приставки", "gaming"),
                    ("Аксессуары для техники", "tech-accessories"),
                ],
                "clothing": [
                    ("Мужская одежда", "mens-clothing"), ("Женская одежда", "womens-clothing"),
                    ("Спортивная одежда", "sport-clothing"), ("Верхняя одежда", "outerwear"),
                    ("Нижнее бельё", "underwear"), ("Купальники", "swimwear"),
                ],
                "shoes": [
                    ("Мужская обувь", "mens-shoes"), ("Женская обувь", "womens-shoes"),
                    ("Детская обувь", "kids-shoes"), ("Спортивная обувь", "sport-shoes"),
                    ("Сандалии и шлёпки", "sandals"),
                ],
                "accessories": [
                    ("Сумки и рюкзаки", "bags"), ("Ремни", "belts"),
                    ("Очки", "glasses"), ("Украшения", "jewelry"),
                    ("Часы", "watches"), ("Головные уборы", "hats"),
                ],
                "home-garden": [
                    ("Постельное бельё", "bedding"), ("Посуда и кухня", "kitchenware"),
                    ("Освещение", "lighting"), ("Декор и интерьер", "decor"),
                    ("Ванная комната", "bathroom"), ("Хранение и организация", "storage"),
                ],
                "furniture": [
                    ("Диваны и кресла", "sofas"), ("Кровати и матрасы", "beds"),
                    ("Столы и стулья", "tables"), ("Шкафы и полки", "wardrobes"),
                    ("Детская мебель", "kids-furniture"),
                ],
                "construction": [
                    ("Инструменты", "tools"), ("Краски и отделка", "paints"),
                    ("Сантехника", "plumbing"), ("Электрика", "electrical"),
                    ("Двери и окна", "doors-windows"),
                ],
                "sport": [
                    ("Футбол", "football"), ("Фитнес и тренажёры", "fitness"),
                    ("Туризм и рыбалка", "tourism"), ("Велоспорт", "cycling"),
                    ("Единоборства", "martial-arts"), ("Плавание", "swimming"),
                ],
                "beauty": [
                    ("Уход за лицом", "face-care"), ("Уход за волосами", "hair-care"),
                    ("Парфюмерия", "perfume"), ("Декоративная косметика", "makeup"),
                    ("Маникюр и педикюр", "nails"),
                ],
                "health": [
                    ("Витамины и БАД", "vitamins"), ("Медицинские товары", "medical"),
                    ("Массажёры", "massagers"), ("Весы и тонометры", "monitors"),
                ],
                "kids": [
                    ("Игрушки", "toys"), ("Одежда для детей", "kids-clothing"),
                    ("Коляски и кресла", "strollers"), ("Школьные товары", "school"),
                    ("Питание для детей", "baby-food"),
                ],
                "auto": [
                    ("Автоаксессуары", "car-accessories"), ("Автохимия", "car-chem"),
                    ("Шины и диски", "tires"), ("Запчасти", "car-parts"),
                    ("Видеорегистраторы", "dashcams"),
                ],
                "food": [
                    ("Бакалея", "grocery"), ("Напитки", "drinks"),
                    ("Сладости", "sweets"), ("Молочные продукты", "dairy"),
                    ("Халяль продукты", "halal"),
                ],
                "pets": [
                    ("Корм для животных", "pet-food"), ("Аксессуары для животных", "pet-accessories"),
                    ("Ветеринарные товары", "vet"),
                ],
                "hobby": [
                    ("Рисование и рукоделие", "art"), ("Музыкальные инструменты", "music"),
                    ("Настольные игры", "board-games"), ("Коллекционирование", "collecting"),
                ],
            }
            for slug, children in subcats.items():
                parent = db.query(Category).filter(Category.slug == slug).first()
                if not parent: continue
                for name, child_slug in children:
                    if not db.query(Category).filter(Category.slug == child_slug).first():
                        db.add(Category(name=name, slug=child_slug, parent_id=parent.id))
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
app.include_router(reviews.router_products, prefix="/api")
app.include_router(favorites.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(waitlist.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(seller_applications.router, prefix="/api")
app.include_router(shop.router, prefix="/api")
app.include_router(banners.router, prefix="/api")
app.include_router(chats.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
