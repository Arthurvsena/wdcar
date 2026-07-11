from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import User, Oficina, ServiceOrder, AuditLog
from auth import get_current_user, hash_password
from permissions import PERMISSOES_DEFAULT
from audit import audit

router = APIRouter(prefix="/dev", tags=["dev"])


def require_dev(user: User = Depends(get_current_user)) -> User:
    if not user.is_dev:
        raise HTTPException(status_code=403, detail="Acesso restrito ao desenvolvedor")
    return user


class OficinaCreateIn(BaseModel):
    nome_oficina: str
    username: str
    password: str
    email: Optional[str] = None


class OficinaPatchIn(BaseModel):
    nome: Optional[str] = None
    ativa: Optional[bool] = None


@router.get("/oficinas")
def list_oficinas(user: User = Depends(require_dev), db: Session = Depends(get_db)):
    oficinas = db.query(Oficina).order_by(Oficina.id).all()
    user_counts = dict(
        db.query(User.oficina_id, func.count(User.id)).group_by(User.oficina_id).all()
    )
    os_counts = dict(
        db.query(ServiceOrder.oficina_id, func.count(ServiceOrder.id)).group_by(ServiceOrder.oficina_id).all()
    )
    return {
        "items": [
            {
                "id": o.id,
                "nome": o.nome,
                "logo": o.logo,
                "ativa": o.ativa,
                "setup_completo": o.setup_completo,
                "usuarios": user_counts.get(o.id, 0),
                "ordens_servico": os_counts.get(o.id, 0),
                "created_at": o.created_at.isoformat() + "Z" if o.created_at else None,
            }
            for o in oficinas
        ]
    }


@router.post("/oficinas")
def create_oficina(payload: OficinaCreateIn, user: User = Depends(require_dev), db: Session = Depends(get_db)):
    nome = payload.nome_oficina.strip()
    username = payload.username.strip()
    if not nome or not username or not payload.password:
        raise HTTPException(status_code=400, detail="Nome da oficina, usuário e senha são obrigatórios")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Este usuário já existe")

    oficina = Oficina(nome=nome, ativa=True, setup_completo=False)
    db.add(oficina)
    db.flush()  # garante oficina.id antes de criar o usuário

    master = User(
        username=username,
        hashed_password=hash_password(payload.password),
        oficina_id=oficina.id,
        nome_oficina=nome,
        email=payload.email,
        is_master=True,
        role="master",
        permissoes=",".join(PERMISSOES_DEFAULT.get("master", [])),
    )
    db.add(master)
    db.flush()
    audit(db, user, "oficina_criada", "oficina", oficina.id, detalhe=f"{nome} (master: {username})", oficina_id=oficina.id)
    db.commit()
    return {
        "ok": True,
        "oficina": {"id": oficina.id, "nome": oficina.nome},
        "master": {"id": master.id, "username": master.username},
    }


@router.patch("/oficinas/{oficina_id}")
def patch_oficina(oficina_id: int, payload: OficinaPatchIn, user: User = Depends(require_dev), db: Session = Depends(get_db)):
    oficina = db.query(Oficina).filter(Oficina.id == oficina_id).first()
    if not oficina:
        raise HTTPException(status_code=404, detail="Oficina não encontrada")
    if oficina_id == user.oficina_id and payload.ativa is False:
        raise HTTPException(status_code=400, detail="Não é possível desativar a própria oficina")
    if payload.nome is not None:
        nome = payload.nome.strip()
        if not nome:
            raise HTTPException(status_code=400, detail="Nome não pode ser vazio")
        oficina.nome = nome
        db.query(User).filter(User.oficina_id == oficina.id).update(
            {User.nome_oficina: nome}, synchronize_session=False
        )
    if payload.ativa is not None:
        oficina.ativa = payload.ativa
    audit(db, user, "oficina_alterada", "oficina", oficina.id, detalhe=f"nome={oficina.nome}, ativa={oficina.ativa}", oficina_id=oficina.id)
    db.commit()
    return {"ok": True, "id": oficina.id, "nome": oficina.nome, "ativa": oficina.ativa}


@router.post("/backup")
def manual_backup(user: User = Depends(require_dev), db: Session = Depends(get_db)):
    from backup_service import create_backup
    try:
        info = create_backup()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    audit(db, user, "backup_manual", detalhe=info["file"], oficina_id=None)
    db.commit()
    return info


@router.get("/backups")
def list_all_backups(user: User = Depends(require_dev)):
    from backup_service import list_backups
    return {"items": list_backups()}


@router.get("/audit")
def list_audit(
    oficina_id: Optional[int] = None,
    acao: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: User = Depends(require_dev),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if oficina_id is not None:
        query = query.filter(AuditLog.oficina_id == oficina_id)
    if acao:
        query = query.filter(AuditLog.acao == acao)
    total = query.count()
    items = query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).offset(skip).limit(min(limit, 200)).all()
    return {"items": [_audit_to_dict(a) for a in items], "total": total}


def _audit_to_dict(a: AuditLog) -> dict:
    return {
        "id": a.id,
        "oficina_id": a.oficina_id,
        "user_id": a.user_id,
        "username": a.username,
        "acao": a.acao,
        "entidade": a.entidade,
        "entidade_id": a.entidade_id,
        "detalhe": a.detalhe,
        "created_at": a.created_at.isoformat() + "Z" if a.created_at else None,
    }
