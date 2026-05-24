from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.core.database import Base, engine
from app.core.config import settings
from app.api.routes import auth, products, cart, orders, seller, users, reviews, favorites, admin, waitlist, notifications, seller_applications, shop

Base.metadata.create_all(bind=engine)

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
