"""
Создаёт тестовые товары с несколькими фото для проверки свайпа карточек.
Запуск: python seed_test_products.py
"""
import requests
import io

BASE = "https://aza-market-backend.onrender.com/api"

# Картинки с picsum.photos (разные, для каждого товара)
PRODUCTS = [
    {
        "title": "iPhone 15 Pro Max 256GB",
        "description": "Флагманский смартфон Apple с чипом A17 Pro",
        "price": 8990,
        "original_price": 10500,
        "stock": 15,
        "brand": "Apple",
        "category_slug": "smartphones",
        "images": [
            "https://picsum.photos/seed/iphone1/400/533",
            "https://picsum.photos/seed/iphone2/400/533",
            "https://picsum.photos/seed/iphone3/400/533",
        ],
    },
    {
        "title": "Nike Air Max 270 кроссовки",
        "description": "Лёгкие и удобные кроссовки для повседневной носки",
        "price": 1290,
        "original_price": 1800,
        "stock": 30,
        "brand": "Nike",
        "category_slug": "sport-shoes",
        "images": [
            "https://picsum.photos/seed/nike1/400/533",
            "https://picsum.photos/seed/nike2/400/533",
            "https://picsum.photos/seed/nike3/400/533",
            "https://picsum.photos/seed/nike4/400/533",
        ],
    },
    {
        "title": "Samsung Galaxy S24 Ultra",
        "description": "Мощный Android смартфон со стилусом S Pen",
        "price": 7500,
        "stock": 8,
        "brand": "Samsung",
        "category_slug": "smartphones",
        "images": [
            "https://picsum.photos/seed/samsung1/400/533",
            "https://picsum.photos/seed/samsung2/400/533",
            "https://picsum.photos/seed/samsung3/400/533",
        ],
    },
    {
        "title": "Диван угловой современный",
        "description": "Просторный угловой диван для гостиной, ткань велюр",
        "price": 4200,
        "original_price": 5500,
        "stock": 5,
        "brand": "HomeStyle",
        "category_slug": "sofas",
        "images": [
            "https://picsum.photos/seed/sofa1/400/533",
            "https://picsum.photos/seed/sofa2/400/533",
            "https://picsum.photos/seed/sofa3/400/533",
        ],
    },
    {
        "title": "Платье летнее женское",
        "description": "Лёгкое летнее платье из натурального хлопка",
        "price": 450,
        "original_price": 650,
        "stock": 50,
        "brand": "Zara",
        "category_slug": "womens-clothing",
        "images": [
            "https://picsum.photos/seed/dress1/400/533",
            "https://picsum.photos/seed/dress2/400/533",
            "https://picsum.photos/seed/dress3/400/533",
        ],
    },
]


def get_token():
    # Запрашиваем OTP
    r = requests.post(f"{BASE}/auth/phone/send", json={"phone": "+992666666666"})
    r.raise_for_status()
    # Верифицируем (код 1234 всегда работает)
    r = requests.post(f"{BASE}/auth/phone/verify", json={"phone": "+992666666666", "code": "1234"})
    r.raise_for_status()
    return r.json()["access_token"]


def get_category_id(token, slug):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{BASE}/products/categories", headers=headers)
    cats = r.json()
    for c in cats:
        if c.get("slug") == slug:
            return c["id"]
    # Если не нашли — берём первую категорию
    return cats[0]["id"] if cats else 1


def download_image(url):
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    return r.content


def create_product(token, product_data, category_id):
    headers = {"Authorization": f"Bearer {token}"}

    # Создаём товар
    payload = {
        "title": product_data["title"],
        "description": product_data["description"],
        "price": product_data["price"],
        "stock": product_data["stock"],
        "brand": product_data["brand"],
        "category_id": category_id,
    }
    if "original_price" in product_data:
        payload["original_price"] = product_data["original_price"]

    r = requests.post(f"{BASE}/products", json=payload, headers=headers)
    r.raise_for_status()
    product_id = r.json()["id"]
    print(f"  Товар создан: ID={product_id}")

    uploaded = 0
    for i, img_url in enumerate(product_data["images"]):
        try:
            img_data = download_image(img_url)
            r = requests.post(
                f"{BASE}/products/{product_id}/images",
                files={"file": (f"photo_{i}.jpg", io.BytesIO(img_data), "image/jpeg")},
                headers=headers,
            )
            if r.status_code == 200:
                uploaded += 1
            else:
                print(f"  Ошибка фото {i}: {r.text}")
        except Exception as e:
            print(f"  Не удалось загрузить фото {i}: {e}")
    print(f"  Загружено {uploaded}/{len(product_data['images'])} фото")

    return product_id


def main():
    print("Авторизация...")
    token = get_token()
    print("Авторизован как demo_seller\n")

    for p in PRODUCTS:
        print(f"Создаём: {p['title']}")
        cat_id = get_category_id(token, p["category_slug"])
        create_product(token, p, cat_id)
        print()

    print("Готово! Обнови приложение чтобы увидеть товары.")


if __name__ == "__main__":
    main()
