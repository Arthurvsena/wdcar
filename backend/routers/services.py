from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Service
from schemas import ServiceCreate, ServiceOut
from auth import get_current_user

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceOut])
def list_services(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Service).filter(Service.oficina_id == user.oficina_id).all()


@router.post("", response_model=ServiceOut)
def create_service(payload: ServiceCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
