from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import require_admin
from app.core.upload import upload_image as cloud_upload
from app.models.user import User, UserRole
from app.models.product import Product, Category
from app.models.order import Order
from app.models.payout import Payout, PayoutStatus
from app.schemas.user import UserOut
from app.schemas.order import OrderOut, OrderStatusUpdate
from app.schemas.payout import PayoutOut
from app.schemas.product import CategoryOut
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Category management ──────────────────────────────────────

SEED_CATEGORIES = [
    {"name": "Товары со склада: Узбекистан", "slug": "warehouse-uz"},
    {"name": "Женщинам",                     "slug": "women"},
    {"name": "Обувь",                        "slug": "shoes"},
    {"name": "Детям",                        "slug": "kids"},
    {"name": "Мужчинам",                     "slug": "men"},
    {"name": "Дом",                          "slug": "home"},
    {"name": "Красота",                      "slug": "beauty"},
    {"name": "Аксессуары",                   "slug": "accessories"},
    {"name": "Электроника",                  "slug": "electronics"},
    {"name": "Игрушки",                      "slug": "toys"},
    {"name": "Мебель",                       "slug": "furniture"},
    {"name": "Товары для взрослых",          "slug": "adult"},
    {"name": "Продукты",                     "slug": "food"},
    {"name": "Цветы",                        "slug": "flowers"},
    {"name": "Бытовая техника",              "slug": "appliances"},
    {"name": "Зоотовары",                    "slug": "pets"},
    {"name": "Спорт",                        "slug": "sport"},
    {"name": "Автотовары",                   "slug": "auto"},
    {"name": "Книги",                        "slug": "books"},
    {"name": "Ювелирные изделия",            "slug": "jewelry"},
    {"name": "Для ремонта",                  "slug": "repair"},
    {"name": "Сад и дача",                   "slug": "garden"},
    {"name": "Здоровье",                     "slug": "health"},
    {"name": "Адаптивные товары",            "slug": "adaptive"},
    {"name": "Канцтовары",                   "slug": "office"},
    {"name": "Акции",                        "slug": "sale"},
]

SEED_SUBCATEGORIES = {
    "warehouse-uz": [
        {"name": "Одежда", "slug": "wuz-clothing"},
        {"name": "Обувь", "slug": "wuz-shoes"},
        {"name": "Сумки и аксессуары", "slug": "wuz-bags"},
        {"name": "Электроника", "slug": "wuz-electronics"},
        {"name": "Товары для дома", "slug": "wuz-home"},
        {"name": "Продукты питания", "slug": "wuz-food"},
        {"name": "Косметика", "slug": "wuz-beauty"},
        {"name": "Детские товары", "slug": "wuz-kids"},
    ],
    "women": [
        {"name": "Блузки и рубашки", "slug": "women-blouses"},
        {"name": "Брюки", "slug": "women-pants"},
        {"name": "Верхняя одежда", "slug": "women-outerwear"},
        {"name": "Джемперы, водолазки и кардиганы", "slug": "women-knitwear"},
        {"name": "Джинсы", "slug": "women-jeans"},
        {"name": "Комбинезоны", "slug": "women-jumpsuits"},
        {"name": "Костюмы", "slug": "women-suits"},
        {"name": "Лонгсливы", "slug": "women-longsleeves"},
        {"name": "Пиджаки, жилеты и жакеты", "slug": "women-jackets"},
        {"name": "Платья и сарафаны", "slug": "women-dresses"},
        {"name": "Толстовки, свитшоты и худи", "slug": "women-hoodies"},
        {"name": "Туники", "slug": "women-tunics"},
        {"name": "Футболки и топы", "slug": "women-tops"},
        {"name": "Халаты", "slug": "women-robes"},
        {"name": "Шорты", "slug": "women-shorts"},
        {"name": "Юбки", "slug": "women-skirts"},
        {"name": "Бельё", "slug": "women-lingerie"},
        {"name": "Большие размеры", "slug": "women-plus-size"},
        {"name": "Будущие мамы", "slug": "women-maternity"},
        {"name": "Для высоких", "slug": "women-tall"},
        {"name": "Для невысоких", "slug": "women-petite"},
        {"name": "Одежда для дома", "slug": "women-homewear"},
        {"name": "Офис", "slug": "women-office"},
        {"name": "Пляжная мода", "slug": "women-swimwear"},
        {"name": "Религиозная одежда", "slug": "women-religious"},
        {"name": "Свадебная одежда", "slug": "women-wedding"},
    ],
    "shoes": [
        {"name": "Кроссовки и кеды", "slug": "shoes-sneakers"},
        {"name": "Туфли", "slug": "shoes-heels"},
        {"name": "Ботинки", "slug": "shoes-boots"},
        {"name": "Сапоги", "slug": "shoes-highboots"},
        {"name": "Балетки", "slug": "shoes-flats"},
        {"name": "Сандалии и шлёпанцы", "slug": "shoes-sandals"},
        {"name": "Мокасины и лоферы", "slug": "shoes-loafers"},
        {"name": "Мужская обувь", "slug": "shoes-men"},
        {"name": "Женская обувь", "slug": "shoes-women"},
        {"name": "Детская обувь", "slug": "shoes-kids"},
        {"name": "Спортивная обувь", "slug": "shoes-sport"},
        {"name": "Домашняя обувь", "slug": "shoes-home"},
        {"name": "Большие размеры", "slug": "shoes-plus"},
    ],
    "kids": [
        {"name": "Одежда для девочек", "slug": "kids-girls-clothing"},
        {"name": "Одежда для мальчиков", "slug": "kids-boys-clothing"},
        {"name": "Обувь для детей", "slug": "kids-shoes"},
        {"name": "Школьные товары", "slug": "kids-school"},
        {"name": "Игрушки", "slug": "kids-toys"},
        {"name": "Коляски и автокресла", "slug": "kids-strollers"},
        {"name": "Питание и кормление", "slug": "kids-feeding"},
        {"name": "Подгузники и гигиена", "slug": "kids-hygiene"},
        {"name": "Детская мебель", "slug": "kids-furniture"},
        {"name": "Новорождённым", "slug": "kids-newborn"},
        {"name": "Книги для детей", "slug": "kids-books"},
        {"name": "Спорт и активный отдых", "slug": "kids-sport"},
        {"name": "Творчество и развитие", "slug": "kids-creativity"},
    ],
    "men": [
        {"name": "Футболки и поло", "slug": "men-tshirts"},
        {"name": "Рубашки", "slug": "men-shirts"},
        {"name": "Брюки", "slug": "men-pants"},
        {"name": "Джинсы", "slug": "men-jeans"},
        {"name": "Верхняя одежда", "slug": "men-outerwear"},
        {"name": "Пиджаки и жакеты", "slug": "men-jackets"},
        {"name": "Костюмы", "slug": "men-suits"},
        {"name": "Джемперы и кардиганы", "slug": "men-knitwear"},
        {"name": "Свитшоты и худи", "slug": "men-hoodies"},
        {"name": "Лонгсливы", "slug": "men-longsleeves"},
        {"name": "Шорты", "slug": "men-shorts"},
        {"name": "Нижнее бельё", "slug": "men-underwear"},
        {"name": "Носки и колготки", "slug": "men-socks"},
        {"name": "Спортивная одежда", "slug": "men-sportswear"},
        {"name": "Одежда для дома", "slug": "men-homewear"},
        {"name": "Большие размеры", "slug": "men-plus-size"},
        {"name": "Религиозная одежда", "slug": "men-religious"},
        {"name": "Для высоких", "slug": "men-tall"},
        {"name": "Комбинезоны и комплекты", "slug": "men-sets"},
        {"name": "Офис", "slug": "men-office"},
        {"name": "Пляжная мода", "slug": "men-swimwear"},
        {"name": "Свадебная одежда", "slug": "men-wedding"},
    ],
    "home": [
        {"name": "Постельное бельё", "slug": "home-bedding"},
        {"name": "Подушки и одеяла", "slug": "home-pillows"},
        {"name": "Полотенца", "slug": "home-towels"},
        {"name": "Шторы и тюль", "slug": "home-curtains"},
        {"name": "Ковры и дорожки", "slug": "home-rugs"},
        {"name": "Кухонные товары", "slug": "home-kitchen"},
        {"name": "Посуда", "slug": "home-dishes"},
        {"name": "Ванная комната", "slug": "home-bathroom"},
        {"name": "Декор и интерьер", "slug": "home-decor"},
        {"name": "Освещение", "slug": "home-lighting"},
        {"name": "Хранение и организация", "slug": "home-storage"},
        {"name": "Уборка и чистота", "slug": "home-cleaning"},
    ],
    "beauty": [
        {"name": "Уход за лицом", "slug": "beauty-face"},
        {"name": "Уход за телом", "slug": "beauty-body"},
        {"name": "Уход за волосами", "slug": "beauty-hair"},
        {"name": "Макияж", "slug": "beauty-makeup"},
        {"name": "Парфюмерия", "slug": "beauty-perfume"},
        {"name": "Маникюр и педикюр", "slug": "beauty-nails"},
        {"name": "Средства для бритья", "slug": "beauty-shaving"},
        {"name": "Солнцезащитные средства", "slug": "beauty-sunscreen"},
        {"name": "Натуральная косметика", "slug": "beauty-natural"},
        {"name": "Инструменты и приборы", "slug": "beauty-tools"},
    ],
    "accessories": [
        {"name": "Сумки и рюкзаки", "slug": "acc-bags"},
        {"name": "Кошельки", "slug": "acc-wallets"},
        {"name": "Ремни", "slug": "acc-belts"},
        {"name": "Очки", "slug": "acc-glasses"},
        {"name": "Часы", "slug": "acc-watches"},
        {"name": "Шапки и шарфы", "slug": "acc-hats"},
        {"name": "Перчатки", "slug": "acc-gloves"},
        {"name": "Зонты", "slug": "acc-umbrellas"},
        {"name": "Чемоданы и дорожные сумки", "slug": "acc-luggage"},
        {"name": "Украшения", "slug": "acc-jewelry"},
    ],
    "electronics": [
        {"name": "Смартфоны", "slug": "elec-smartphones"},
        {"name": "Ноутбуки", "slug": "elec-laptops"},
        {"name": "Планшеты", "slug": "elec-tablets"},
        {"name": "Наушники и аудио", "slug": "elec-audio"},
        {"name": "Телевизоры", "slug": "elec-tvs"},
        {"name": "Фото и видео", "slug": "elec-photo"},
        {"name": "Умные часы", "slug": "elec-smartwatches"},
        {"name": "Игровые приставки", "slug": "elec-gaming"},
        {"name": "Аксессуары для техники", "slug": "elec-accessories"},
        {"name": "Компьютерная техника", "slug": "elec-computers"},
        {"name": "Зарядки и кабели", "slug": "elec-chargers"},
        {"name": "Умный дом", "slug": "elec-smarthome"},
    ],
    "toys": [
        {"name": "Мягкие игрушки", "slug": "toys-soft"},
        {"name": "Конструкторы", "slug": "toys-lego"},
        {"name": "Куклы", "slug": "toys-dolls"},
        {"name": "Машинки и транспорт", "slug": "toys-cars"},
        {"name": "Настольные игры", "slug": "toys-board"},
        {"name": "Пазлы", "slug": "toys-puzzles"},
        {"name": "Развивающие игрушки", "slug": "toys-educational"},
        {"name": "Радиоуправляемые", "slug": "toys-rc"},
        {"name": "Творчество и рукоделие", "slug": "toys-craft"},
        {"name": "Игрушки для малышей", "slug": "toys-baby"},
        {"name": "Спортивные игрушки", "slug": "toys-sport"},
    ],
    "furniture": [
        {"name": "Диваны и кресла", "slug": "furn-sofas"},
        {"name": "Кровати и матрасы", "slug": "furn-beds"},
        {"name": "Столы и стулья", "slug": "furn-tables"},
        {"name": "Шкафы и комоды", "slug": "furn-wardrobes"},
        {"name": "Детская мебель", "slug": "furn-kids"},
        {"name": "Офисная мебель", "slug": "furn-office"},
        {"name": "Мебель для кухни", "slug": "furn-kitchen"},
        {"name": "Полки и стеллажи", "slug": "furn-shelves"},
        {"name": "Прихожая", "slug": "furn-hallway"},
        {"name": "Мебель для ванной", "slug": "furn-bathroom"},
    ],
    "food": [
        {"name": "Бакалея и крупы", "slug": "food-grocery"},
        {"name": "Молочные продукты", "slug": "food-dairy"},
        {"name": "Мясо и птица", "slug": "food-meat"},
        {"name": "Сладости и снеки", "slug": "food-sweets"},
        {"name": "Напитки", "slug": "food-drinks"},
        {"name": "Чай и кофе", "slug": "food-tea"},
        {"name": "Орехи и сухофрукты", "slug": "food-nuts"},
        {"name": "Специи и приправы", "slug": "food-spices"},
        {"name": "Халяльные продукты", "slug": "food-halal"},
        {"name": "Консервы", "slug": "food-canned"},
        {"name": "Масла и соусы", "slug": "food-oils"},
    ],
    "flowers": [
        {"name": "Букеты", "slug": "flowers-bouquets"},
        {"name": "Комнатные растения", "slug": "flowers-indoor"},
        {"name": "Искусственные цветы", "slug": "flowers-artificial"},
        {"name": "Горшки и кашпо", "slug": "flowers-pots"},
        {"name": "Семена и луковицы", "slug": "flowers-seeds"},
        {"name": "Грунт и удобрения", "slug": "flowers-soil"},
    ],
    "appliances": [
        {"name": "Холодильники", "slug": "appl-fridges"},
        {"name": "Стиральные машины", "slug": "appl-washing"},
        {"name": "Телевизоры", "slug": "appl-tvs"},
        {"name": "Кондиционеры", "slug": "appl-ac"},
        {"name": "Микроволновые печи", "slug": "appl-microwave"},
        {"name": "Пылесосы", "slug": "appl-vacuums"},
        {"name": "Утюги и отпариватели", "slug": "appl-irons"},
        {"name": "Кухонная техника", "slug": "appl-kitchen"},
        {"name": "Блендеры и миксеры", "slug": "appl-blenders"},
        {"name": "Кофемашины и чайники", "slug": "appl-coffee"},
        {"name": "Водонагреватели", "slug": "appl-heaters"},
        {"name": "Вентиляторы и обогреватели", "slug": "appl-fans"},
    ],
    "pets": [
        {"name": "Корм для кошек", "slug": "pets-cat-food"},
        {"name": "Корм для собак", "slug": "pets-dog-food"},
        {"name": "Аксессуары для кошек", "slug": "pets-cat-acc"},
        {"name": "Аксессуары для собак", "slug": "pets-dog-acc"},
        {"name": "Птицы и рыбки", "slug": "pets-birds"},
        {"name": "Грызуны", "slug": "pets-rodents"},
        {"name": "Ветеринарные препараты", "slug": "pets-vet"},
        {"name": "Лежанки и домики", "slug": "pets-beds"},
        {"name": "Игрушки для животных", "slug": "pets-toys"},
        {"name": "Уход за шерстью", "slug": "pets-grooming"},
    ],
    "sport": [
        {"name": "Фитнес и тренажёры", "slug": "sport-fitness"},
        {"name": "Футбол", "slug": "sport-football"},
        {"name": "Баскетбол", "slug": "sport-basketball"},
        {"name": "Велоспорт", "slug": "sport-cycling"},
        {"name": "Плавание", "slug": "sport-swimming"},
        {"name": "Боевые искусства", "slug": "sport-martial"},
        {"name": "Туризм и треккинг", "slug": "sport-trekking"},
        {"name": "Рыбалка и охота", "slug": "sport-fishing"},
        {"name": "Зимние виды спорта", "slug": "sport-winter"},
        {"name": "Йога и пилатес", "slug": "sport-yoga"},
        {"name": "Спортивная одежда", "slug": "sport-clothing"},
        {"name": "Спортивное питание", "slug": "sport-nutrition"},
    ],
    "auto": [
        {"name": "Автоаксессуары", "slug": "auto-accessories"},
        {"name": "Автохимия и масла", "slug": "auto-chemicals"},
        {"name": "Шины и диски", "slug": "auto-tires"},
        {"name": "Запчасти", "slug": "auto-parts"},
        {"name": "Видеорегистраторы", "slug": "auto-dashcams"},
        {"name": "Автозвук", "slug": "auto-audio"},
        {"name": "Инструменты для авто", "slug": "auto-tools"},
        {"name": "Чехлы и коврики", "slug": "auto-covers"},
        {"name": "Навигаторы", "slug": "auto-gps"},
        {"name": "Зарядки для авто", "slug": "auto-chargers"},
    ],
    "books": [
        {"name": "Художественная литература", "slug": "books-fiction"},
        {"name": "Детская литература", "slug": "books-kids"},
        {"name": "Учебники и пособия", "slug": "books-education"},
        {"name": "Бизнес и саморазвитие", "slug": "books-business"},
        {"name": "Наука и техника", "slug": "books-science"},
        {"name": "Кулинария", "slug": "books-cooking"},
        {"name": "История и политика", "slug": "books-history"},
        {"name": "Религия", "slug": "books-religion"},
        {"name": "Психология", "slug": "books-psychology"},
        {"name": "Комиксы и манга", "slug": "books-comics"},
    ],
    "jewelry": [
        {"name": "Кольца", "slug": "jew-rings"},
        {"name": "Серьги", "slug": "jew-earrings"},
        {"name": "Цепочки и колье", "slug": "jew-necklaces"},
        {"name": "Браслеты", "slug": "jew-bracelets"},
        {"name": "Броши", "slug": "jew-brooches"},
        {"name": "Золото", "slug": "jew-gold"},
        {"name": "Серебро", "slug": "jew-silver"},
        {"name": "Бижутерия", "slug": "jew-costume"},
        {"name": "Свадебные украшения", "slug": "jew-wedding"},
        {"name": "Мужские украшения", "slug": "jew-men"},
    ],
    "repair": [
        {"name": "Стройматериалы", "slug": "rep-materials"},
        {"name": "Краски и лаки", "slug": "rep-paints"},
        {"name": "Напольные покрытия", "slug": "rep-flooring"},
        {"name": "Обои и декор стен", "slug": "rep-wallpaper"},
        {"name": "Сантехника", "slug": "rep-plumbing"},
        {"name": "Электрика", "slug": "rep-electrical"},
        {"name": "Двери и окна", "slug": "rep-doors"},
        {"name": "Инструменты", "slug": "rep-tools"},
        {"name": "Крепёж и фурнитура", "slug": "rep-hardware"},
        {"name": "Плитка и кафель", "slug": "rep-tiles"},
    ],
    "garden": [
        {"name": "Семена и рассада", "slug": "garden-seeds"},
        {"name": "Удобрения и грунт", "slug": "garden-soil"},
        {"name": "Садовый инвентарь", "slug": "garden-tools"},
        {"name": "Полив и орошение", "slug": "garden-irrigation"},
        {"name": "Теплицы", "slug": "garden-greenhouse"},
        {"name": "Садовая мебель", "slug": "garden-furniture"},
        {"name": "Газонная техника", "slug": "garden-lawn"},
        {"name": "Защита от вредителей", "slug": "garden-pesticides"},
        {"name": "Декор для сада", "slug": "garden-decor"},
    ],
    "health": [
        {"name": "Витамины и БАДы", "slug": "health-vitamins"},
        {"name": "Медицинские приборы", "slug": "health-devices"},
        {"name": "Ортопедия", "slug": "health-ortho"},
        {"name": "Массажёры", "slug": "health-massagers"},
        {"name": "Медицинская одежда", "slug": "health-clothing"},
        {"name": "Уход за зубами", "slug": "health-dental"},
        {"name": "Слуховые аппараты", "slug": "health-hearing"},
        {"name": "Очки и линзы", "slug": "health-vision"},
        {"name": "Аптечные товары", "slug": "health-pharmacy"},
    ],
    "adaptive": [
        {"name": "Кресла-коляски", "slug": "adapt-wheelchairs"},
        {"name": "Костыли и трости", "slug": "adapt-crutches"},
        {"name": "Ходунки", "slug": "adapt-walkers"},
        {"name": "Протезы и ортезы", "slug": "adapt-prosthetics"},
        {"name": "Товары для слабовидящих", "slug": "adapt-vision"},
        {"name": "Товары для слабослышащих", "slug": "adapt-hearing"},
        {"name": "Реабилитационное оборудование", "slug": "adapt-rehab"},
    ],
    "office": [
        {"name": "Ручки и карандаши", "slug": "off-pens"},
        {"name": "Тетради и блокноты", "slug": "off-notebooks"},
        {"name": "Бумага и картон", "slug": "off-paper"},
        {"name": "Папки и файлы", "slug": "off-folders"},
        {"name": "Краски и фломастеры", "slug": "off-paints"},
        {"name": "Пластилин и глина", "slug": "off-clay"},
        {"name": "Чертёжные принадлежности", "slug": "off-drawing"},
        {"name": "Офисная техника", "slug": "off-equipment"},
        {"name": "Рюкзаки и пеналы", "slug": "off-bags"},
    ],
    "adult": [
        {"name": "Для неё", "slug": "adult-women"},
        {"name": "Для него", "slug": "adult-men"},
        {"name": "Для двоих", "slug": "adult-couples"},
        {"name": "Нижнее бельё", "slug": "adult-lingerie"},
        {"name": "Аксессуары", "slug": "adult-accessories"},
    ],
    "sale": [
        {"name": "Скидки до 30%", "slug": "sale-30"},
        {"name": "Скидки до 50%", "slug": "sale-50"},
        {"name": "Скидки свыше 50%", "slug": "sale-50plus"},
        {"name": "Распродажа сезона", "slug": "sale-season"},
        {"name": "Акции дня", "slug": "sale-daily"},
    ],
}


class CategoryCreate(BaseModel):
    name: str
    slug: str
    parent_id: Optional[int] = None


@router.get("/categories", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(Category).order_by(Category.id).all()


@router.post("/categories", response_model=CategoryOut)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    existing = db.query(Category).filter(Category.slug == data.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Категория с таким slug уже существует")
    cat = Category(name=data.name, slug=data.slug, parent_id=data.parent_id)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    parent_id: Optional[int] = None


@router.patch("/categories/{cat_id}", response_model=CategoryOut)
def update_category(cat_id: int, data: CategoryUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    if data.name is not None:
        cat.name = data.name
    if data.slug is not None:
        existing = db.query(Category).filter(Category.slug == data.slug, Category.id != cat_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Slug уже используется")
        cat.slug = data.slug
    if data.parent_id is not None:
        cat.parent_id = data.parent_id
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{cat_id}", status_code=204)
def delete_category(cat_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    db.delete(cat)
    db.commit()


@router.post("/categories/{cat_id}/image", response_model=CategoryOut)
def upload_category_image(
    cat_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    url = cloud_upload(file, folder="categories")
    cat.image_url = url
    db.commit()
    db.refresh(cat)
    return CategoryOut(id=cat.id, name=cat.name, slug=cat.slug, parent_id=cat.parent_id, image_url=cat.image_url)


@router.post("/categories/seed")
def seed_categories(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Insert all categories + subcategories. Safe to call multiple times."""
    added_roots = 0
    added_subs = 0
    errors = []

    # 1. Seed root categories — one savepoint per item so a failure doesn't wipe others
    for item in SEED_CATEGORIES:
        exists = db.query(Category).filter(Category.slug == item["slug"]).first()
        if exists:
            continue
        sp = db.begin_nested()
        try:
            db.add(Category(name=item["name"], slug=item["slug"], parent_id=None))
            sp.commit()
            added_roots += 1
        except Exception as e:
            sp.rollback()
            errors.append(f"root:{item['slug']}:{str(e)[:80]}")

    db.commit()

    # 2. Seed subcategories — one savepoint per item
    for parent_slug, children in SEED_SUBCATEGORIES.items():
        parent = db.query(Category).filter(Category.slug == parent_slug).first()
        if not parent:
            errors.append(f"no_parent:{parent_slug}")
            continue
        for child in children:
            exists = db.query(Category).filter(Category.slug == child["slug"]).first()
            if exists:
                continue
            sp = db.begin_nested()
            try:
                db.add(Category(name=child["name"], slug=child["slug"], parent_id=parent.id))
                sp.commit()
                added_subs += 1
            except Exception as e:
                sp.rollback()
                errors.append(f"sub:{child['slug']}:{str(e)[:80]}")

    db.commit()

    return {
        "ok": True,
        "added_roots": added_roots,
        "added_subs": added_subs,
        "errors": errors,
        "message": f"Добавлено {added_roots} категорий и {added_subs} подкатегорий"
    }


class UserRoleUpdate(BaseModel):
    role: UserRole

class UserActiveUpdate(BaseModel):
    is_active: bool


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return {
        "users": db.query(User).count(),
        "products": db.query(Product).filter(Product.is_active == True).count(),
        "orders": db.query(Order).count(),
        "sellers": db.query(User).filter(User.role == UserRole.seller).count(),
    }


@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/role", response_model=UserOut)
def update_user_role(user_id: int, data: UserRoleUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = data.role
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/active", response_model=UserOut)
def update_user_active(user_id: int, data: UserActiveUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return user


@router.get("/products")
def list_all_products(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    products = db.query(Product).order_by(Product.created_at.desc()).all()
    return [{"id": p.id, "title": p.title, "price": p.price, "stock": p.stock, "is_active": p.is_active, "seller_id": p.seller_id} for p in products]


@router.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    db.commit()


@router.get("/orders", response_model=List[OrderOut])
def list_all_orders(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    from sqlalchemy.orm import joinedload
    from app.models.order import OrderItem
    return db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.category),
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.images),
    ).order_by(Order.created_at.desc()).all()


class PayoutReview(BaseModel):
    status: PayoutStatus
    comment: Optional[str] = None


@router.get("/payouts", response_model=List[PayoutOut])
def list_all_payouts(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(Payout).order_by(Payout.created_at.desc()).all()


@router.patch("/payouts/{payout_id}", response_model=PayoutOut)
def review_payout(payout_id: int, data: PayoutReview, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    payout = db.query(Payout).filter(Payout.id == payout_id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    if payout.status != PayoutStatus.pending:
        raise HTTPException(status_code=400, detail="Заявка уже обработана")

    if data.status == PayoutStatus.rejected:
        # Возвращаем деньги продавцу при отклонении
        seller = db.query(User).filter(User.id == payout.seller_id).first()
        if seller:
            seller.balance = (seller.balance or 0) + payout.amount

    payout.status = data.status
    payout.comment = data.comment
    db.commit()
    db.refresh(payout)
    return payout
