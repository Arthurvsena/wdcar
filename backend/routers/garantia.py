from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func
from database import get_db
from auth import get_current_user
from models import ServiceOrder, Vehicle, Cliente, OrderPart, OrderService, Part, Service, User, StatusHistory
from datetime import datetime, timedelta, timezone
from typing import Optional

router = APIRouter(prefix="/garantia", tags=["Garantia"])


@router.get("/vehicles/search")
def search_vehicles(
    placa: str = Query(..., min_length=1),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vehicles = (
        db.query(Vehicle)
        .join(Cliente)
        .filter(
            Vehicle.oficina_id == user.oficina_id,
            Vehicle.placa.ilike(f"%{placa}%"),
        )
        .all()
    )
    return [
        {
            "id": v.id,
            "placa": v.placa,
            "modelo": v.modelo,
            "marca": v.marca,
            "ano": v.ano,
            "cor": v.cor,
            "cliente": {
                "id": v.cliente.id,
                "nome": v.cliente.nome,
                "telefone": v.cliente.telefone,
            },
        }
        for v in vehicles
    ]


@router.get("/vehicles/{vehicle_id}/history")
def vehicle_history(
    vehicle_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vehicle = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id, Vehicle.oficina_id == user.oficina_id
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if vehicle.oficina_id != user.oficina_id:
        raise HTTPException(status_code=403, detail="Access denied")

    orders = (
        db.query(ServiceOrder)
        .filter(
            ServiceOrder.vehicle_id == vehicle_id,
            ServiceOrder.oficina_id == user.oficina_id,
        )
        .options(
            joinedload(ServiceOrder.cliente),
            joinedload(ServiceOrder.vehicle),
            selectinload(ServiceOrder.parts_used).joinedload(OrderPart.part),
            selectinload(ServiceOrder.services_used).joinedload(OrderService.service),
            selectinload(ServiceOrder.status_history),
        )
        .order_by(ServiceOrder.created_at.desc())
        .all()
    )

    return [
        {
            "id": o.id,
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "updated_at": o.updated_at.isoformat() if o.updated_at else None,
            "valor_total": o.valor_total,
            "observacoes": o.observacoes,
            "garantia_meses": o.garantia_meses,
            "garantia_fim": o.garantia_fim.isoformat() if o.garantia_fim else None,
            "cliente": {
                "id": o.cliente.id,
                "nome": o.cliente.nome,
            } if o.cliente else None,
            "parts_used": [
                {
                    "id": op.id,
                    "part_id": op.part_id,
                    "part_nome": op.part.nome if op.part else None,
                    "quantidade": op.quantidade,
                    "preco_unitario": op.preco_unitario,
                }
                for op in o.parts_used
            ],
            "services_used": [
                {
                    "id": osv.id,
                    "service_id": osv.service_id,
                    "service_nome": osv.service.nome if osv.service else None,
                    "valor_cobrado": osv.valor_cobrado,
                }
                for osv in o.services_used
            ],
            "status_history": [
                {
                    "id": sh.id,
                    "status": sh.status,
                    "user_id": sh.user_id,
                    "created_at": sh.created_at.isoformat() if sh.created_at else None,
                }
                for sh in o.status_history
            ],
        }
        for o in orders
    ]


@router.post("/orders/{order_id}/warranty")
def set_warranty(
    order_id: int,
    body: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(ServiceOrder).filter(
        ServiceOrder.id == order_id,
        ServiceOrder.oficina_id == user.oficina_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    now = datetime.now(timezone.utc)

    if "garantia_meses" in body and body["garantia_meses"] is not None:
        meses = body["garantia_meses"]
        order.garantia_meses = meses
        order.garantia_fim = now + timedelta(days=meses * 30.44)
    elif "garantia_fim" in body and body["garantia_fim"] is not None:
        try:
            fim = datetime.fromisoformat(body["garantia_fim"])
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid garantia_fim format. Use ISO 8601.")
        order.garantia_fim = fim
        delta = fim - now
        order.garantia_meses = max(1, round(delta.days / 30.44))
    else:
        raise HTTPException(status_code=400, detail="Provide garantia_meses or garantia_fim")

    db.commit()
    db.refresh(order)

    return {
        "id": order.id,
        "garantia_meses": order.garantia_meses,
        "garantia_fim": order.garantia_fim.isoformat() if order.garantia_fim else None,
    }


@router.delete("/orders/{order_id}/warranty")
def remove_warranty(
    order_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(ServiceOrder).filter(
        ServiceOrder.id == order_id,
        ServiceOrder.oficina_id == user.oficina_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.garantia_meses = None
    order.garantia_fim = None
    db.commit()

    return {"ok": True}


@router.get("/expiring")
def expiring_warranties(
    days: int = Query(30, ge=1),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    limit = now + timedelta(days=days)

    orders = (
        db.query(ServiceOrder)
        .filter(
            ServiceOrder.oficina_id == user.oficina_id,
            ServiceOrder.garantia_fim.isnot(None),
            ServiceOrder.garantia_fim >= now,
            ServiceOrder.garantia_fim <= limit,
        )
        .options(
            joinedload(ServiceOrder.cliente),
            joinedload(ServiceOrder.vehicle),
        )
        .order_by(ServiceOrder.garantia_fim.asc())
        .all()
    )

    return [
        {
            "id": o.id,
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "garantia_meses": o.garantia_meses,
            "garantia_fim": o.garantia_fim.isoformat() if o.garantia_fim else None,
            "dias_restantes": (o.garantia_fim - now).days if o.garantia_fim else None,
            "cliente": {
                "id": o.cliente.id,
                "nome": o.cliente.nome,
            } if o.cliente else None,
            "vehicle": {
                "id": o.vehicle.id,
                "placa": o.vehicle.placa,
                "modelo": o.vehicle.modelo,
                "marca": o.vehicle.marca,
            } if o.vehicle else None,
        }
        for o in orders
    ]
