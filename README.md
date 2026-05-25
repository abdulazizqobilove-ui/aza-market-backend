# Marketplace MVP

Маркетплейс в стиле Ozon/Wildberries. Next.js 14 + FastAPI + PostgreSQL.

## Быстрый старт

### Вариант 1: Docker (рекомендуется)

```bash
docker-compose up -d
# Сделать seed (категории + демо-пользователи):
docker-compose exec backend python seed.py
```

Открыть: http://localhost:3000

### Вариант 2: Локально

**Требования:** Node.js 18+, Python 3.11+, PostgreSQL, Redis

**Бэкенд:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env       # настроить DATABASE_URL
python seed.py               # начальные данные
uvicorn app.main:app --reload
```

**Фронтенд:**
```bash
cd frontend
npm install
npm run dev
```

## Демо-аккаунты

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | admin@marketplace.com | admin123 |
| Продавец | seller@marketplace.com | seller123 |

## API документация

http://localhost:8000/docs (Swagger UI)

## Структура

```
marketplace/
├── backend/
│   ├── app/
│   │   ├── api/routes/     # auth, products, cart, orders, seller, users
│   │   ├── core/           # config, database, security
│   │   ├── models/         # SQLAlchemy ORM
│   │   ├── schemas/        # Pydantic схемы
│   │   └── main.py
│   ├── seed.py             # начальные данные
│   └── requirements.txt
└── frontend/
    └── src/
        ├── app/
        │   ├── (shop)/     # главная, товар, корзина, заказы
        │   ├── auth/       # вход, регистрация
        │   └── seller/     # кабинет продавца
        ├── components/
        ├── lib/api.ts      # axios клиент + типы
        └── store/          # zustand: auth, cart
```

## Функционал

- Каталог с поиском, фильтрацией и сортировкой
- Карточка товара с фото, описанием, рейтингом
- Регистрация и вход (покупатель / продавец)
- Корзина с управлением количеством
- Оформление заказа с адресом доставки
- История заказов покупателя
- Кабинет продавца: добавление товаров, загрузка фото
- Управление статусами заказов продавцом
