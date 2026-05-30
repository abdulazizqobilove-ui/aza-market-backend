from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user, require_seller
from app.models.order import Order, OrderItem, OrderStatus
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate, OrderTrackingUpdate

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

    # Compute delivery cost per unique seller
    seen_sellers: dict[int, float] = {}
    for ci in cart_items:
        sid = ci.product.seller_id
        if sid not in seen_sellers:
            seller = db.query(User).filter(User.id == sid).first()
            seller_city = (seller.shop_city or "").strip().lower() if seller else ""
            buyer_city = (data.delivery_city or "").strip().lower()
            if seller_city and seller_city == buyer_city:
                seen_sellers[sid] = ci.product.delivery_price or 0.0
            else:
                seen_sellers[sid] = ci.product.delivery_price_other or 0.0
    delivery_cost = sum(seen_sellers.values())

    subtotal = sum(ci.product.price * ci.quantity for ci in cart_items)
    total = subtotal + delivery_cost
    order = Order(
        buyer_id=user.id,
        total_price=total,
        delivery_cost=delivery_cost,
        delivery_address=data.delivery_address,
        delivery_city=data.delivery_city,
        contact_phone=data.contact_phone,
        payment_method=data.payment_method,
        delivery_date=data.delivery_date,
        delivery_time=data.delivery_time,
    )
    db.add(order)
    db.flush()

    item_ids_to_delete = [ci.id for ci in cart_items]
    for ci in cart_items:
        db.add(OrderItem(order_id=order.id, product_id=ci.product_id, quantity=ci.quantity, price=ci.product.price))
        ci.product.stock -= ci.quantity
        ci.product.sales_count = (ci.product.sales_count or 0) + ci.quantity

    db.query(CartItem).filter(CartItem.id.in_(item_ids_to_delete)).delete(synchronize_session=False)

    # Создаём запись о платеже
    method = PaymentMethod.cod if data.payment_method in ("on_delivery", "cod", "cash") else PaymentMethod.card
    db.add(Payment(
        order_id=order.id,
        amount=total,
        currency="TJS",
        method=method,
        status=PaymentStatus.pending,
    ))

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


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id, Order.buyer_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in (OrderStatus.pending, OrderStatus.confirmed):
        raise HTTPException(status_code=400, detail="Нельзя отменить заказ на этом этапе")
    order.status = OrderStatus.cancelled
    # return stock
    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity
    db.commit()
    return _load_order(db, order.id)


@router.post("/{order_id}/pay", response_model=OrderOut)
def pay_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id, Order.buyer_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == OrderStatus.cancelled:
        raise HTTPException(status_code=400, detail="Заказ отменён")
    order.is_paid = True
    db.commit()
    return _load_order(db, order.id)


@router.patch("/{order_id}/mark-paid", response_model=OrderOut)
def mark_order_paid(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Seller or admin confirms cash/on_delivery payment received."""
    from app.models.user import UserRole
    if current_user.role not in (UserRole.seller, UserRole.admin):
        raise HTTPException(status_code=403, detail="Нет доступа")

    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Admin can mark any order; seller only their own
    if current_user.role == UserRole.seller:
        seller_ids = {item.product.seller_id for item in order.items}
        if current_user.id not in seller_ids:
            raise HTTPException(status_code=403, detail="Нет доступа")

    if order.is_paid:
        raise HTTPException(status_code=400, detail="Заказ уже оплачен")

    order.is_paid = True
    db.commit()
    return _load_order(db, order.id)


@router.patch("/{order_id}/tracking", response_model=OrderOut)
def set_tracking(
    order_id: int,
    data: OrderTrackingUpdate,
    db: Session = Depends(get_db),
    seller: User = Depends(require_seller),
):
    """Seller sets delivery service + tracking number. Auto-advances status to 'shipped'."""
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Only seller who owns items (or admin) can set tracking
    from app.models.user import UserRole
    if seller.role != UserRole.admin:
        seller_ids = {item.product.seller_id for item in order.items}
        if seller.id not in seller_ids:
            raise HTTPException(status_code=403, detail="Нет доступа")

    order.delivery_service = data.delivery_service
    order.tracking_number = data.tracking_number or ""

    # Auto-advance to shipped if not yet there
    if order.status in (OrderStatus.pending, OrderStatus.confirmed, OrderStatus.processing):
        order.status = OrderStatus.shipped

    db.commit()
    return _load_order(db, order.id)


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
    return _load_order(db, order.id)
