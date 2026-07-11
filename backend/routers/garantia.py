from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Warranty, ServiceOrder, Vehicle
from schemas import WarrantyCreate, WarrantyOut
from auth import get_current_user
from permissions import require_permission

router = APIRouter(prefix="/garantia", tags=["garantia"], dependencies=[Depends(require_permission("garantia"))])


def _refresh_status(warranty: Warranty) -> Warranty:
    if warranty.status == "ativa" and warranty.data_expiracao < datetime.now(timezone.utc).replace(tzinfo=None):
        warranty.status = "expirada"
    return warranty


@router.get("")
def list_warranties(skip: int = 0, limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Warranty).filter(Warranty.oficina_id == user.oficina_id)
    total = query.count()
    items = query.order_by(Warranty.created_at.desc()).offset(skip).limit(limit).all()
    for w in items:
        _refresh_status(w)
    return {"items": items, "total": total}


@router.post("", response_model=WarrantyOut)
def create_warranty(payload: WarrantyCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.id == payload.service_order_id, ServiceOrder.oficina_id == user.oficina_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Service order not found")
    vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id, Vehicle.oficina_id == user.oficina_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    data_inicio = datetime.now(timezone.utc)
    warranty = Warranty(
        oficina_id=user.oficina_id,
        service_order_id=payload.service_order_id,
        vehicle_id=payload.vehicle_id,
        descricao=payload.descricao,
        prazo_dias=payload.prazo_dias,
        data_inicio=data_inicio,
        data_expiracao=data_inicio + timedelta(days=payload.prazo_dias),
    )
    db.add(warranty)
    db.commit()
    db.refresh(warranty)
    return warranty


@router.get("/os/{order_id}")
def get_warranties_by_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = (
        db.query(Warranty)
        .filter(Warranty.oficina_id == user.oficina_id, Warranty.service_order_id == order_id)
        .order_by(Warranty.created_at.desc())
        .all()
    )
    for w in items:
        _refresh_status(w)
    return {"items": items, "total": len(items)}


@router.get("/vehicle/{vehicle_id}")
def get_warranties_by_vehicle(vehicle_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = (
        db.query(Warranty)
        .filter(Warranty.oficina_id == user.oficina_id, Warranty.vehicle_id == vehicle_id)
        .order_by(Warranty.created_at.desc())
        .all()
    )
    for w in items:
        _refresh_status(w)
    return {"items": items, "total": len(items)}


@router.get("/stats")
def warranty_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    warranties = db.query(Warranty).filter(Warranty.oficina_id == user.oficina_id).all()
    for w in warranties:
        _refresh_status(w)
    total = len(warranties)
    ativas = sum(1 for w in warranties if w.status == "ativa")
    expiradas = sum(1 for w in warranties if w.status == "expirada")
    acionadas = sum(1 for w in warranties if w.status == "acionada")
    return {
        "total": total,
        "ativas": ativas,
        "expiradas": expiradas,
        "acionadas": acionadas,
    }
