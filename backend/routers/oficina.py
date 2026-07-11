import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Oficina, AuditLog
from auth import get_current_user
from permissions import require_master_or_admin

router = APIRouter(prefix="/oficina", tags=["oficina"])

LOGO_DIR = "uploads/logos"
LOGO_ALLOWED_EXTENSIONS = {".png"}
LOGO_ALLOWED_MIMETYPES = {"image/png"}
MAX_LOGO_SIZE = 5 * 1024 * 1024
os.makedirs(LOGO_DIR, exist_ok=True)


class OficinaUpdate(BaseModel):
    nome: Optional[str] = None


def _oficina_to_dict(o: Oficina) -> dict:
    return {
        "id": o.id,
        "nome": o.nome,
        "logo": o.logo,
        "ativa": o.ativa,
        "setup_completo": o.setup_completo,
    }


def _get_oficina(db: Session, oficina_id: int) -> Oficina:
    oficina = db.query(Oficina).filter(Oficina.id == oficina_id).first()
    if not oficina:
        raise HTTPException(status_code=404, detail="Oficina não encontrada")
    return oficina


@router.get("")
def get_my_oficina(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _oficina_to_dict(_get_oficina(db, user.oficina_id))


@router.put("")
def update_my_oficina(payload: OficinaUpdate, user: User = Depends(require_master_or_admin), db: Session = Depends(get_db)):
    oficina = _get_oficina(db, user.oficina_id)
    if payload.nome is not None:
        nome = payload.nome.strip()
        if not nome:
            raise HTTPException(status_code=400, detail="Nome da oficina não pode ser vazio")
        oficina.nome = nome
        # mantém users.nome_oficina em sincronia (campo legado usado em telas antigas)
        db.query(User).filter(User.oficina_id == oficina.id).update(
            {User.nome_oficina: nome}, synchronize_session=False
        )
    db.commit()
    return _oficina_to_dict(oficina)


@router.post("/logo")
def upload_logo(file: UploadFile = File(...), user: User = Depends(require_master_or_admin), db: Session = Depends(get_db)):
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in LOGO_ALLOWED_EXTENSIONS or file.content_type not in LOGO_ALLOWED_MIMETYPES:
        raise HTTPException(status_code=400, detail="A logo deve ser um arquivo PNG")
    contents = file.file.read(MAX_LOGO_SIZE + 1)
    if len(contents) > MAX_LOGO_SIZE:
        raise HTTPException(status_code=400, detail=f"Arquivo muito grande. Máximo {MAX_LOGO_SIZE // (1024*1024)}MB")

    oficina = _get_oficina(db, user.oficina_id)
    filename = f"oficina_{oficina.id}.png"
    filepath = os.path.join(LOGO_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    oficina.logo = f"/uploads/logos/{filename}"
    db.commit()
    return _oficina_to_dict(oficina)


@router.delete("/logo")
def remove_logo(user: User = Depends(require_master_or_admin), db: Session = Depends(get_db)):
    oficina = _get_oficina(db, user.oficina_id)
    if oficina.logo:
        path = os.path.join(LOGO_DIR, os.path.basename(oficina.logo))
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass
        oficina.logo = None
        db.commit()
    return _oficina_to_dict(oficina)


@router.get("/audit")
def list_audit_oficina(
    skip: int = 0,
    limit: int = 50,
    user: User = Depends(require_master_or_admin),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog).filter(AuditLog.oficina_id == user.oficina_id)
    total = query.count()
    items = query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).offset(skip).limit(min(limit, 200)).all()
    return {
        "items": [
            {
                "id": a.id,
                "username": a.username,
                "acao": a.acao,
                "entidade": a.entidade,
                "entidade_id": a.entidade_id,
                "detalhe": a.detalhe,
                "created_at": a.created_at.isoformat() + "Z" if a.created_at else None,
            }
            for a in items
        ],
        "total": total,
    }


@router.post("/setup")
def complete_setup(payload: OficinaUpdate, user: User = Depends(require_master_or_admin), db: Session = Depends(get_db)):
    """Primeiro acesso: define o nome da oficina e marca o setup como concluído.
    A logo (opcional) é enviada separadamente via POST /oficina/logo."""
    oficina = _get_oficina(db, user.oficina_id)
    nome = (payload.nome or "").strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Informe o nome da oficina")
    oficina.nome = nome
    oficina.setup_completo = True
    db.query(User).filter(User.oficina_id == oficina.id).update(
        {User.nome_oficina: nome}, synchronize_session=False
    )
    db.commit()
    return _oficina_to_dict(oficina)
