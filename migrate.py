from app.core.database import engine
from sqlalchemy import text

migrations = [
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR DEFAULT 'cash' NOT NULL",
    "CREATE TABLE IF NOT EXISTS waitlist (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), product_id INTEGER NOT NULL REFERENCES products(id), created_at TIMESTAMPTZ DEFAULT NOW())",
    "CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), title VARCHAR NOT NULL, body TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW())",
    "CREATE TABLE IF NOT EXISTS seller_applications (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), shop_name VARCHAR NOT NULL, description TEXT, status VARCHAR DEFAULT 'pending' NOT NULL, admin_comment VARCHAR, created_at TIMESTAMPTZ DEFAULT NOW())",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_name VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_description TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_banner_url VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_logo_url VARCHAR",
]

with engine.connect() as conn:
    for sql in migrations:
        conn.execute(text(sql))
    conn.commit()

print("Migration done")
