from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os
from app.core.database import Base, engine
from app.core.config import settings
from app.core.limiter import limiter
from app.api.routes import auth, products, cart, orders, seller, users, reviews, favorites, admin, waitlist, notifications, seller_applications, shop, banners, chats
from app.models import payment_card, chat, report  # ensure tables are created

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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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


@app.get("/privacy", response_class=HTMLResponse)
def privacy_policy():
    return """<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Политика конфиденциальности — AZA Market</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;color:#374151;line-height:1.7}header{background:#8B5CF6;padding:28px 20px;text-align:center}header h1{color:#fff;font-size:22px;font-weight:900}header p{color:rgba(255,255,255,.8);font-size:13px;margin-top:4px}.container{max-width:720px;margin:32px auto;background:#fff;border-radius:16px;padding:40px 36px;box-shadow:0 1px 4px rgba(0,0,0,.06)}h2{font-size:18px;font-weight:800;color:#111827;margin-top:36px;margin-bottom:10px;border-left:4px solid #8B5CF6;padding-left:12px}h3{font-size:15px;font-weight:700;color:#374151;margin-top:20px;margin-bottom:8px}p{margin-bottom:12px;font-size:15px}ul{padding-left:20px;margin-bottom:12px}li{margin-bottom:6px;font-size:15px}.badge{display:inline-block;background:#f0fdf4;color:#16a34a;font-weight:700;font-size:14px;padding:10px 16px;border-radius:10px;margin:8px 0 16px}.note{background:#f5f3ff;border-radius:12px;padding:16px 20px;margin-top:32px;font-size:14px;color:#7c3aed;font-weight:600;text-align:center}footer{text-align:center;padding:32px 16px;color:#9ca3af;font-size:13px}@media(max-width:600px){.container{margin:16px;padding:24px 20px}}</style></head><body><header><h1>AZA Market</h1><p>Политика конфиденциальности</p></header><div class="container"><p style="color:#9ca3af;font-size:13px;margin-bottom:8px;">Дата вступления в силу: 26 мая 2026 г.</p><p>Настоящая Политика конфиденциальности объясняет, какие данные мы собираем, как используем, храним и защищаем их при использовании приложения <strong>AZA Market</strong>.</p><h2>1. Какие данные мы собираем</h2><h3>1.1 Личные данные</h3><ul><li>Имя и фамилия</li><li>Номер телефона</li><li>Адрес электронной почты</li><li>Дата регистрации аккаунта</li><li>Фото профиля</li></ul><h3>1.2 Данные продавца</h3><ul><li>Паспортные данные, ИНН</li><li>Банковские реквизиты</li><li>Название и адрес магазина</li><li>Информация о товарах</li></ul><h3>1.3 Данные о заказах</h3><ul><li>История заказов и доставки</li><li>Адрес получения</li><li>Способ оплаты и статус заказов</li></ul><h3>1.4 Технические данные</h3><ul><li>IP-адрес, тип устройства, версия ОС</li><li>Идентификаторы устройства</li><li>Логи ошибок и данные аналитики</li></ul><h2>2. Как мы используем данные</h2><ul><li>Создание и обслуживание аккаунта</li><li>Обработка заказов и подключение продавцов</li><li>Улучшение работы приложения</li><li>Обеспечение безопасности и предотвращение мошенничества</li><li>Отправка уведомлений о заказах и сервисе</li><li>Выполнение требований законодательства</li></ul><h2>3. Передача данных третьим лицам</h2><p>Мы можем передавать данные платёжным системам, службам доставки, государственным органам при наличии законных требований, сервисам аналитики и облачного хранения.</p><div class="badge">✓ Мы не продаём личные данные пользователей третьим лицам.</div><h2>4. Хранение и защита данных</h2><ul><li>Шифрование соединений (HTTPS)</li><li>Ограничение доступа к данным</li><li>Защита серверов</li><li>Мониторинг подозрительной активности</li></ul><h2>5. Права пользователей</h2><ul><li>Получить информацию о своих данных</li><li>Изменить данные аккаунта</li><li>Удалить аккаунт и персональные данные</li><li>Отозвать согласие на обработку данных</li></ul><h2>6. Аналитика</h2><p>Приложение использует Sentry для улучшения стабильности и производительности.</p><h2>7. Дети</h2><p>Сервис не предназначен для детей младше 13 лет.</p><h2>8. Изменения политики</h2><p>Мы можем обновлять настоящую Политику. Продолжение использования приложения означает согласие с новой версией.</p><h2>9. Контакты</h2><p>Email: <a href="mailto:support@azamarket.tj" style="color:#8B5CF6;">support@azamarket.tj</a><br/>Компания: AZA Market<br/>Страна: Таджикистан</p><div class="note">Используя приложение, вы соглашаетесь с обработкой персональных данных в соответствии с данной политикой.</div></div><footer>© 2026 AZA Market · Таджикистан</footer></body></html>"""
