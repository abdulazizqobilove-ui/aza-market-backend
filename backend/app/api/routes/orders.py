from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user, require_seller
from app.models.order import Order, OrderItem, OrderStatus
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User
from app.models.notification import Notification
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate
from app.core.push import send_expo_push

PLATFORM_COMMISSION = 0.10  # 10% комиссия платформы

router = APIRouter(prefix="/orders", tags=["orders"])


def _load_order(db: Session, order_id: int) -> Order:
    return db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.category),
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.images),
    ).filter(Order.id == order_id).first()


@router.post("", response_model=OrderOut, status_code=201)
def create_order(data: OrderCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(CartItem).options(joinedload(CartItem.product)).filter(CartItem.user_id == user.id)
    if data.item_ids:
        query = query.filter(CartItem.id.in_(data.item_ids))
    cart_items = query.all()

    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    for ci in cart_items:
        if ci.product.stock < ci.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for {ci.product.title}")

    total = sum(ci.product.price * ci.quantity for ci in cart_items)
    order = Order(
        buyer_id=user.id,
        total_price=total,
        delivery_address=data.delivery_address,
        delivery_city=data.delivery_city,
        contact_phone=data.contact_phone,
        payment_method=data.payment_method,
    )
    db.add(order)
    db.flush()

    item_ids_to_delete = [ci.id for ci in cart_items]
    for ci in cart_items:
        db.add(OrderItem(order_id=order.id, product_id=ci.product_id, quantity=ci.quantity, price=ci.product.price))
        ci.product.stock -= ci.quantity
        ci.product.sales_count = (ci.product.sales_count or 0) + ci.quantity

    db.query(CartItem).filter(CartItem.id.in_(item_ids_to_delete)).delete(synchronize_session=False)
    db.commit()

    return _load_order(db, order.id)


@router.get("", response_model=List[OrderOut])
def my_orders(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    orders = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.category),
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.images),
    ).filter(Order.buyer_id == user.id).order_by(Order.created_at.desc()).all()
    return orders


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = _load_order(db, order_id)
    if not order or order.buyer_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.seller)
    ).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    was_delivered = order.status == OrderStatus.delivered
    order.status = data.status

    # Начисляем баланс продавцам при доставке
    if data.status == OrderStatus.delivered and not was_delivered:
        seller_earnings: dict[int, float] = {}
        for item in order.items:
            sid = item.product.seller_id
            earned = item.price * item.quantity * (1 - PLATFORM_COMMISSION)
            seller_earnings[sid] = seller_earnings.get(sid, 0) + earned

        for seller_id, amount in seller_earnings.items():
            s = db.query(User).filter(User.id == seller_id).first()
            if s:
                s.balance = (s.balance or 0) + amount

    db.commit()

    # Notify buyer of status change
    STATUS_LABELS = {
        "pending": "Принят в обработку",
        "confirmed": "Подтверждён",
        "processing": "Обрабатывается",
        "shipped": "Отправлен — в пути",
        "delivered": "Доставлен",
        "cancelled": "Отменён",
    }
    label = STATUS_LABELS.get(data.status.value, data.status.value)
    buyer = db.query(User).filter(User.id == order.buyer_id).first()
    if buyer:
        notif = Notification(
            user_id=buyer.id,
            title=f"Заказ #{order.id}",
            body=label,
        )
        db.add(notif)
        db.commit()
        if buyer.push_token:
            send_expo_push(
                [buyer.push_token],
                f"Заказ #{order.id}",
                label,
                {"type": "order", "orderId": order.id},
            )

    return _load_order(db, order.id)
