"""Serviço de notificações: persiste no banco e envia Web Push (VAPID).

As chaves VAPID são geradas automaticamente na primeira execução e salvas
em vapid_private.pem (configurável via VAPID_PRIVATE_KEY_FILE).
"""
import base64
import json
import os
import threading

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Notification, PushSubscription

try:
    from pywebpush import webpush, WebPushException
    PUSH_AVAILABLE = True
except ImportError:
    PUSH_AVAILABLE = False

VAPID_PRIVATE_KEY_FILE = os.getenv(
    "VAPID_PRIVATE_KEY_FILE",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "vapid_private.pem"),
)
VAPID_CLAIM_EMAIL = os.getenv("VAPID_CLAIM_EMAIL", "mailto:admin@wdocar.com")

_lock = threading.Lock()


def _ensure_vapid_private_key():
    with _lock:
        if not os.path.isfile(VAPID_PRIVATE_KEY_FILE):
            os.makedirs(os.path.dirname(VAPID_PRIVATE_KEY_FILE) or ".", exist_ok=True)
            key = ec.generate_private_key(ec.SECP256R1())
            pem = key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            )
            with open(VAPID_PRIVATE_KEY_FILE, "wb") as f:
                f.write(pem)
    return VAPID_PRIVATE_KEY_FILE


def get_vapid_public_key() -> str:
    """Chave pública no formato base64url (ponto EC não comprimido), usada pelo navegador."""
    path = _ensure_vapid_private_key()
    with open(path, "rb") as f:
        key = serialization.load_pem_private_key(f.read(), password=None)
    raw = key.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _send_pushes(oficina_id: int, payload: dict):
    """Roda em thread própria com sessão própria para não segurar a resposta HTTP."""
    if not PUSH_AVAILABLE:
        return
    db = SessionLocal()
    try:
        subs = db.query(PushSubscription).filter(PushSubscription.oficina_id == oficina_id).all()
        if not subs:
            return
        private_key_path = _ensure_vapid_private_key()
        data = json.dumps(payload)
        for sub in subs:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                    },
                    data=data,
                    vapid_private_key=private_key_path,
                    vapid_claims={"sub": VAPID_CLAIM_EMAIL},
                    timeout=10,
                )
            except WebPushException as e:
                status = getattr(getattr(e, "response", None), "status_code", None)
                if status in (404, 410):
                    db.delete(sub)
                    db.commit()
            except Exception:
                pass
    finally:
        db.close()


def notify_oficina(
    db: Session,
    oficina_id: int,
    tipo: str,
    titulo: str,
    mensagem: str = None,
    link: str = None,
    dedupe: bool = False,
):
    """Cria a notificação (o commit fica por conta do chamador) e dispara Web Push.

    dedupe=True evita repetir enquanto existir uma notificação não lida
    do mesmo tipo/link (usado para estoque baixo).
    """
    if dedupe:
        existing = (
            db.query(Notification)
            .filter(
                Notification.oficina_id == oficina_id,
                Notification.tipo == tipo,
                Notification.link == link,
                Notification.lida == False,  # noqa: E712
            )
            .first()
        )
        if existing:
            return None

    notif = Notification(
        oficina_id=oficina_id,
        tipo=tipo,
        titulo=titulo,
        mensagem=mensagem,
        link=link,
    )
    db.add(notif)
    # torna a notificação visível para a checagem de dedupe na mesma sessão
    # (SessionLocal usa autoflush=False)
    db.flush()

    payload = {"title": titulo, "body": mensagem or "", "url": link or "/", "tag": tipo}
    threading.Thread(target=_send_pushes, args=(oficina_id, payload), daemon=True).start()
    return notif
