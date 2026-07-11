from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Service
from schemas import ServiceCreate, ServiceOut
from auth import get_current_user
from permissions import require_permission

router = APIRouter(prefix="/services", tags=["services"], dependencies=[Depends(require_permission("servicos"))])


@router.get("")
def list_services(skip: int = 0, limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Service).filter(Service.oficina_id == user.oficina_id)
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/{service_id}", response_model=ServiceOut)
def get_service(service_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    svc = db.query(Service).filter(Service.id == service_id, Service.oficina_id == user.oficina_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    return svc


@router.post("", response_model=ServiceOut)
def create_service(payload: ServiceCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(Service).filter(
        Service.oficina_id == user.oficina_id,
        Service.nome == payload.nome
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Service with this name already exists")
    svc = Service(oficina_id=user.oficina_id, **payload.model_dump())
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


@router.put("/{service_id}", response_model=ServiceOut)
def update_service(service_id: int, payload: ServiceCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    svc = db.query(Service).filter(Service.id == service_id, Service.oficina_id == user.oficina_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    existing = db.query(Service).filter(
        Service.oficina_id == user.oficina_id,
        Service.nome == payload.nome,
        Service.id != service_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Service with this name already exists")
    for k, v in payload.model_dump().items():
        setattr(svc, k, v)
    db.commit()
    db.refresh(svc)
    return svc


@router.delete("/{service_id}")
def delete_service(service_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    svc = db.query(Service).filter(Service.id == service_id, Service.oficina_id == user.oficina_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(svc)
    db.commit()
    return {"ok": True}
