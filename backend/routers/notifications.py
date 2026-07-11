from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Notification, PushSubscription
from auth import get_current_user
from notification_service import get_vapid_public_key, PUSH_AVAILABLE

router = APIRouter(prefix="/notifications", tags=["notifications"])


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscribeIn(BaseModel):
    endpoint: str
    keys: PushKeys


class PushUnsubscribeIn(BaseModel):
    endpoint: str


def _notif_to_dict(n: Notification) -> dict:
    return {
        "id": n.id,
        "tipo": n.tipo,
        "titulo": n.titulo,
        "mensagem": n.mensagem,
        "link": n.link,
        "lida": n.lida,
        "created_at": n.created_at.isoformat() + "Z" if n.created_at else None,
    }


@router.get("")
def list_notifications(limit: int = 30, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    base = db.query(Notification).filter(Notification.oficina_id == user.oficina_id)
    unread = base.filter(Notification.lida == False).count()  # noqa: E712
    items = base.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit).all()
    return {"items": [_notif_to_dict(n) for n in items], "unread": unread}


@router.post("/read-all")
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.oficina_id == user.oficina_id,
        Notification.lida == False,  # noqa: E712
    ).update({Notification.lida: True}, synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.post("/{notification_id}/read")
def mark_read(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.oficina_id == user.oficina_id,
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.lida = True
    db.commit()
    return {"ok": True}


@router.get("/vapid-public-key")
def vapid_public_key(user: User = Depends(get_current_user)):
    if not PUSH_AVAILABLE:
        raise HTTPException(status_code=503, detail="Web Push indisponível no servidor")
    return {"public_key": get_vapid_public_key()}


@router.post("/subscribe")
def subscribe(payload: PushSubscribeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(PushSubscription).filter(PushSubscription.endpoint == payload.endpoint).first()
    if sub:
        sub.user_id = user.id
        sub.oficina_id = user.oficina_id
        sub.p256dh = payload.keys.p256dh
        sub.auth = payload.keys.auth
    else:
        sub = PushSubscription(
            oficina_id=user.oficina_id,
            user_id=user.id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
        )
        db.add(sub)
    db.commit()
    return {"ok": True}


@router.post("/unsubscribe")
def unsubscribe(payload: PushUnsubscribeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == payload.endpoint,
        PushSubscription.user_id == user.id,
    ).delete(synchronize_session=False)
    db.commit()
    return {"ok": True}
