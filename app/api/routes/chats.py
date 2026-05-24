from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel
from app.core.database import get_db, SessionLocal
from app.core.security import decode_token
from app.api.deps import get_current_user
from app.models.user import User
from app.models.chat import Chat, Message
from app.models.product import Product

router = APIRouter(prefix="/chats", tags=["chats"])


# ── Schemas ────────────────────────────────────────────────────

class MessageOut(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    sender_name: str
    sender_avatar: Optional[str] = None
    text: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ChatOut(BaseModel):
    id: int
    buyer_id: int
    seller_id: int
    product_id: Optional[int] = None
    product_title: Optional[str] = None
    product_image: Optional[str] = None
    other_name: str
    other_avatar: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    created_at: datetime


class StartChatRequest(BaseModel):
    seller_id: int
    product_id: Optional[int] = None


# ── WebSocket connection manager ────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: Dict[int, List[WebSocket]] = {}

    async def connect(self, chat_id: int, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(chat_id, []).append(ws)

    def disconnect(self, chat_id: int, ws: WebSocket):
        conns = self.active.get(chat_id, [])
        if ws in conns:
            conns.remove(ws)

    async def broadcast(self, chat_id: int, data: dict):
        for ws in list(self.active.get(chat_id, [])):
            try:
                await ws.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()


# ── REST endpoints ─────────────────────────────────────────────

@router.post("", response_model=ChatOut, status_code=201)
def start_chat(
    data: StartChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.id == data.seller_id:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")

    existing = db.query(Chat).filter(
        Chat.buyer_id == user.id,
        Chat.seller_id == data.seller_id,
        Chat.product_id == data.product_id,
    ).first()

    if existing:
        return _build_chat_out(existing, user.id, db)

    chat = Chat(buyer_id=user.id, seller_id=data.seller_id, product_id=data.product_id)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return _build_chat_out(chat, user.id, db)


@router.get("", response_model=List[ChatOut])
def list_chats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    chats = db.query(Chat).filter(
        or_(Chat.buyer_id == user.id, Chat.seller_id == user.id)
    ).order_by(Chat.updated_at.desc()).all()
    return [_build_chat_out(c, user.id, db) for c in chats]


@router.get("/{chat_id}/messages", response_model=List[MessageOut])
def get_messages(
    chat_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat or user.id not in (chat.buyer_id, chat.seller_id):
        raise HTTPException(status_code=404, detail="Chat not found")

    # Mark messages from other side as read
    db.query(Message).filter(
        Message.chat_id == chat_id,
        Message.sender_id != user.id,
        Message.is_read == False,
    ).update({"is_read": True})
    db.commit()

    messages = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at).all()
    return [_msg_out(m) for m in messages]


# ── WebSocket ──────────────────────────────────────────────────

@router.websocket("/{chat_id}/ws")
async def chat_websocket(
    chat_id: int,
    ws: WebSocket,
    token: str = Query(...),
):
    db: Session = SessionLocal()
    try:
        # Auth
        payload = decode_token(token)
        if not payload:
            await ws.close(code=4001)
            return
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not user:
            await ws.close(code=4001)
            return

        # Verify membership
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
        if not chat or user.id not in (chat.buyer_id, chat.seller_id):
            await ws.close(code=4003)
            return

        await manager.connect(chat_id, ws)

        while True:
            data = await ws.receive_json()
            text = (data.get("text") or "").strip()
            if not text:
                continue

            msg = Message(chat_id=chat_id, sender_id=user.id, text=text)
            db.add(msg)
            # bump chat updated_at for sorting
            chat.updated_at = msg.created_at
            db.commit()
            db.refresh(msg)

            await manager.broadcast(chat_id, _msg_out(msg).__dict__)

    except WebSocketDisconnect:
        manager.disconnect(chat_id, ws)
    except Exception:
        manager.disconnect(chat_id, ws)
    finally:
        db.close()


# ── Helpers ────────────────────────────────────────────────────

def _msg_out(m: Message) -> MessageOut:
    sender = m.sender
    return MessageOut(
        id=m.id,
        chat_id=m.chat_id,
        sender_id=m.sender_id,
        sender_name=sender.full_name or sender.username if sender else "?",
        sender_avatar=sender.avatar_url if sender else None,
        text=m.text,
        is_read=m.is_read,
        created_at=m.created_at,
    )


def _build_chat_out(chat: Chat, my_id: int, db: Session) -> ChatOut:
    is_buyer = chat.buyer_id == my_id
    other_id = chat.seller_id if is_buyer else chat.buyer_id
    other = db.query(User).filter(User.id == other_id).first()

    last_msg = db.query(Message).filter(Message.chat_id == chat.id).order_by(Message.created_at.desc()).first()
    unread = db.query(Message).filter(
        Message.chat_id == chat.id,
        Message.sender_id != my_id,
        Message.is_read == False,
    ).count()

    product = db.query(Product).filter(Product.id == chat.product_id).first() if chat.product_id else None
    product_image = None
    if product and product.images:
        main = next((i.url for i in product.images if i.is_main), None)
        product_image = main or product.images[0].url

    return ChatOut(
        id=chat.id,
        buyer_id=chat.buyer_id,
        seller_id=chat.seller_id,
        product_id=chat.product_id,
        product_title=product.title if product else None,
        product_image=product_image,
        other_name=(other.full_name or other.username) if other else "?",
        other_avatar=other.avatar_url if other else None,
        last_message=last_msg.text if last_msg else None,
        last_message_at=last_msg.created_at if last_msg else None,
        unread_count=unread,
        created_at=chat.created_at,
    )
