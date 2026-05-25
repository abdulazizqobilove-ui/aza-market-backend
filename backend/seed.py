"""Run once to seed categories and a demo admin user."""
from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.product import Category

Base.metadata.create_all(bind=engine)

CATEGORIES = [
    {"name": "Электроника", "slug": "electronics", "children": [
        {"name": "Смартфоны", "slug": "smartphones"},
        {"name": "Ноутбуки", "slug": "laptops"},
        {"name": "Наушники", "slug": "headphones"},
    ]},
    {"name": "Одежда", "slug": "clothing", "children": [
        {"name": "Мужская", "slug": "mens-clothing"},
        {"name": "Женская", "slug": "womens-clothing"},
    ]},
    {"name": "Дом и сад", "slug": "home-garden", "children": [
        {"name": "Мебель", "slug": "furniture"},
        {"name": "Кухня", "slug": "kitchen"},
    ]},
    {"name": "Спорт", "slug": "sport", "children": [
        {"name": "Тренажёры", "slug": "gym"},
        {"name": "Велосипеды", "slug": "bikes"},
    ]},
    {"name": "Красота и здоровье", "slug": "beauty", "children": []},
    {"name": "Детские товары", "slug": "kids", "children": []},
]

db = SessionLocal()

try:
    for cat_data in CATEGORIES:
        parent = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
        if not parent:
            parent = Category(name=cat_data["name"], slug=cat_data["slug"])
            db.add(parent)
            db.flush()
        for child_data in cat_data.get("children", []):
            child = db.query(Category).filter(Category.slug == child_data["slug"]).first()
            if not child:
                child = Category(name=child_data["name"], slug=child_data["slug"], parent_id=parent.id)
                db.add(child)

    admin = db.query(User).filter(User.email == "admin@marketplace.com").first()
    if not admin:
        admin = User(
            email="admin@marketplace.com",
            username="admin",
            hashed_password=hash_password("admin123"),
            full_name="Администратор",
            role=UserRole.admin,
        )
        db.add(admin)

    seller = db.query(User).filter(User.email == "seller@marketplace.com").first()
    if not seller:
        seller = User(
            email="seller@marketplace.com",
            username="demo_seller",
            hashed_password=hash_password("seller123"),
            full_name="Демо Продавец",
            role=UserRole.seller,
        )
        db.add(seller)

    db.commit()
    print("Seed completed successfully!")
    print("Admin: admin@marketplace.com / admin123")
    print("Seller: seller@marketplace.com / seller123")
finally:
    db.close()
