from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload
from database import get_db
from models import (
    User, ServiceOrder, OrderPart, OrderService,
    StatusHistory, OSStatus
)
from auth import get_current_user
from permissions import require_mecanico

router = APIRouter(prefix="/mecanico", tags=["mecanico"], dependencies=[Depends(require_mecanico)])


ALLOWED_STATUSES = [
    OSStatus.EM_ANDAMENTO.value,
    OSStatus.AGUARDANDO_APROVACAO.value,
]


def _order_to_dict(o: ServiceOrder) -> dict:
    return {
        "id": o.id,
        "oficina_id": o.oficina_id,
        "cliente_id": o.cliente_id,
        "vehicle_id": o.vehicle_id,
        "status": o.status,
        "orcamento_status": o.orcamento_status,
        "observacoes": o.observacoes,
        "nota": o.nota,
        "prioridade": o.prioridade,
        "valor_total": o.valor_total,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "updated_at": o.updated_at.isoformat() if o.updated_at else None,
        "cliente": {
            "id": o.cliente.id,
            "nome": o.cliente.nome,
            "telefone": o.cliente.telefone,
            "email": o.cliente.email,
        } if o.cliente else None,
        "vehicle": {
            "id": o.vehicle.id,
            "marca": o.vehicle.marca,
            "modelo": o.vehicle.modelo,
            "placa": o.vehicle.placa,
            "ano": o.vehicle.ano,
            "cor": o.vehicle.cor,
        } if o.vehicle else None,
        "parts_used": [
            {
                "id": op.id,
                "part_id": op.part_id,
                "quantidade": op.quantidade,
                "preco_unitario": op.preco_unitario,
                "part_nome": op.part.nome if op.part else None,
            }
            for op in o.parts_used
        ],
        "services_used": [
            {
                "id": osv.id,
                "service_id": osv.service_id,
                "valor_cobrado": osv.valor_cobrado,
                "service_nome": osv.service.nome if osv.service else None,
            }
            for osv in o.services_used
        ],
    }


@router.get("/orders")
def get_mecanico_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = (
        db.query(ServiceOrder)
        .filter(ServiceOrder.oficina_id == user.oficina_id)
        .filter(ServiceOrder.status.in_(ALLOWED_STATUSES))
        .options(
            joinedload(ServiceOrder.cliente),
            joinedload(ServiceOrder.vehicle),
            selectinload(ServiceOrder.parts_used).joinedload(OrderPart.part),
            selectinload(ServiceOrder.services_used).joinedload(OrderService.service),
        )
        .all()
    )
    for o in orders:
        o.prioridade = o.prioridade or 0
    orders.sort(key=lambda o: (-o.prioridade, o.created_at))
    return {"orders": [_order_to_dict(o) for o in orders]}


@router.post("/orders/{order_id}/notes")
def add_order_note(order_id: int, payload: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id, ServiceOrder.oficina_id == user.oficina_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    texto = payload.get("texto")
    if texto is None:
        raise HTTPException(status_code=400, detail="Missing field 'texto'")
    order.nota = texto
    db.commit()
    return {"ok": True, "nota": order.nota}


@router.get("/orders/{order_id}/status-history")
def get_order_status_history(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id, ServiceOrder.oficina_id == user.oficina_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    history = (
        db.query(StatusHistory)
        .filter(StatusHistory.order_id == order_id)
        .options(joinedload(StatusHistory.user))
        .order_by(StatusHistory.created_at.desc())
        .all()
    )
    return {
        "history": [
            {
                "id": h.id,
                "status": h.status,
                "user_id": h.user_id,
                "user_name": h.user.username if h.user else None,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in history
        ]
    }
