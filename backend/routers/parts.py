from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Part
from schemas import PartCreate, PartOut
from auth import get_current_user
from notification_service import notify_oficina
from audit import audit

from permissions import require_permission

router = APIRouter(prefix="/parts", tags=["parts"], dependencies=[Depends(require_permission("pecas"))])


@router.get("/low-stock")
def list_low_stock_parts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    parts = (
        db.query(Part)
        .filter(
            Part.oficina_id == user.oficina_id,
            Part.estoque_minimo.isnot(None),
            Part.quantidade <= Part.estoque_minimo,
        )
        .all()
    )
    return {"items": parts, "total": len(parts)}


@router.get("")
def list_parts(skip: int = 0, limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Part).filter(Part.oficina_id == user.oficina_id)
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/{part_id}", response_model=PartOut)
def get_part(part_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    part = db.query(Part).filter(Part.id == part_id, Part.oficina_id == user.oficina_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    return part


@router.post("", response_model=PartOut)
def create_part(payload: PartCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(Part).filter(
        Part.oficina_id == user.oficina_id,
        Part.nome == payload.nome
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Part with this name already exists")
    if payload.codigo:
        existing = db.query(Part).filter(
            Part.oficina_id == user.oficina_id,
            Part.codigo == payload.codigo
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Part with this code already exists")
    part = Part(oficina_id=user.oficina_id, **payload.model_dump())
    db.add(part)
    db.flush()
    audit(db, user, "peca_criada", "part", part.id, detalhe=part.nome)
    db.commit()
    db.refresh(part)
    return part


@router.put("/{part_id}", response_model=PartOut)
def update_part(part_id: int, payload: PartCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    part = db.query(Part).filter(Part.id == part_id, Part.oficina_id == user.oficina_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    existing = db.query(Part).filter(
        Part.oficina_id == user.oficina_id,
        Part.nome == payload.nome,
        Part.id != part_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Part with this name already exists")
    if payload.codigo:
        existing = db.query(Part).filter(
            Part.oficina_id == user.oficina_id,
            Part.codigo == payload.codigo,
            Part.id != part_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Part with this code already exists")
    quantidade_anterior = part.quantidade
    for k, v in payload.model_dump().items():
        setattr(part, k, v)
    if (
        part.estoque_minimo
        and part.quantidade <= part.estoque_minimo
        and quantidade_anterior > part.quantidade
    ):
        notify_oficina(
            db,
            part.oficina_id,
            tipo="estoque_baixo",
            titulo="⚠️ Estoque baixo",
            mensagem=f"{part.nome}: restam {part.quantidade} un. (mínimo: {part.estoque_minimo})",
            link=f"/pecas?alerta={part.id}",
            dedupe=True,
        )
    db.commit()
    db.refresh(part)
    return part


@router.delete("/{part_id}")
def delete_part(part_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    part = db.query(Part).filter(Part.id == part_id, Part.oficina_id == user.oficina_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    audit(db, user, "peca_excluida", "part", part.id, detalhe=part.nome)
    db.delete(part)
    db.commit()
    return {"ok": True}
