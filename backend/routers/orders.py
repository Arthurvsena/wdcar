import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload
from database import get_db
from models import (
    User, ServiceOrder, OrderPart, OrderService,
    Part, Service, Cliente, Vehicle, Transaction,
    OSStatus, OrcamentoStatus,
)
from schemas import (
    ServiceOrderCreate, ServiceOrderUpdate, ServiceOrderOut,
    OrderPartCreate, OrderServiceCreate,
)
from auth import get_current_user

router = APIRouter(prefix="/orders", tags=["orders"])


def _recalc_total(order: ServiceOrder, db: Session):
    total = sum(op.quantidade * op.preco_unitario for op in order.parts_used)
    total += sum(osv.valor_cobrado for osv in order.services_used)
    order.valor_total = total


def _calc_prioridade(o: ServiceOrder) -> int:
    if o.status in (OSStatus.FINALIZADA.value, OSStatus.CANCELADA.value):
        return 0
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    created = o.created_at.replace(tzinfo=None) if o.created_at else now
    days_waiting = max(0, (now - created).days)
    base = days_waiting * 10
    if o.aguardando_peca:
        return base - 30
    return base + 50


@router.get("")
def list_orders(skip: int = 0, limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(ServiceOrder).filter(ServiceOrder.oficina_id == user.oficina_id)
    total = query.count()
    orders = (
        query
        .options(
            joinedload(ServiceOrder.cliente),
            joinedload(ServiceOrder.vehicle),
            selectinload(ServiceOrder.parts_used).joinedload(OrderPart.part),
            selectinload(ServiceOrder.services_used).joinedload(OrderService.service),
        )
        .offset(skip).limit(limit)
        .all()
    )
    result = []
    for o in orders:
        o.prioridade = _calc_prioridade(o)
        result.append(_order_to_dict(o))
    result.sort(key=lambda x: x["prioridade"], reverse=True)
    return {"orders": result, "total": total}


def _order_to_dict(o: ServiceOrder) -> dict:
    return {
        "id": o.id,
        "oficina_id": o.oficina_id,
        "cliente_id": o.cliente_id,
        "vehicle_id": o.vehicle_id,
        "status": o.status,
        "orcamento_status": o.orcamento_status,
        "orcamento_token": o.orcamento_token,
        "observacoes": o.observacoes,
        "prioridade": o.prioridade,
        "aguardando_peca": bool(o.aguardando_peca),
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "updated_at": o.updated_at.isoformat() if o.updated_at else None,
        "valor_total": o.valor_total,
        "cliente": {
            "id": o.cliente.id,
            "oficina_id": o.cliente.oficina_id,
            "nome": o.cliente.nome,
            "cpf_cnpj": o.cliente.cpf_cnpj,
            "telefone": o.cliente.telefone,
            "email": o.cliente.email,
            "created_at": o.cliente.created_at.isoformat() if o.cliente.created_at else None,
        } if o.cliente else None,
        "vehicle": {
            "id": o.vehicle.id,
            "oficina_id": o.vehicle.oficina_id,
            "cliente_id": o.vehicle.cliente_id,
            "placa": o.vehicle.placa,
            "modelo": o.vehicle.modelo,
            "marca": o.vehicle.marca,
            "ano": o.vehicle.ano,
            "cor": o.vehicle.cor,
        } if o.vehicle else None,
        "parts_used": [
            {
                "id": op.id,
                "order_id": op.order_id,
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
                "order_id": osv.order_id,
                "service_id": osv.service_id,
                "valor_cobrado": osv.valor_cobrado,
                "service_nome": osv.service.nome if osv.service else None,
            }
            for osv in o.services_used
        ],
    }


@router.post("", response_model=ServiceOrderOut)
def create_order(payload: ServiceOrderCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cli = db.query(Cliente).filter(Cliente.id == payload.cliente_id, Cliente.oficina_id == user.oficina_id).first()
    if not cli:
        raise HTTPException(status_code=404, detail="Cliente not found")
    veh = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id, Vehicle.oficina_id == user.oficina_id).first()
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if veh.cliente_id != payload.cliente_id:
        raise HTTPException(status_code=400, detail="Vehicle does not belong to this client")
    token = secrets.token_urlsafe(16)
    order = ServiceOrder(
        oficina_id=user.oficina_id,
        cliente_id=payload.cliente_id,
        vehicle_id=payload.vehicle_id,
        observacoes=payload.observacoes,
        orcamento_token=token,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return _order_to_dict(order)


@router.get("/{order_id}", response_model=ServiceOrderOut)
def get_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id, ServiceOrder.oficina_id == user.oficina_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.prioridade = _calc_prioridade(order)
    return _order_to_dict(order)


@router.post("/{order_id}/parts")
def add_part_to_order(order_id: int, payload: OrderPartCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id, ServiceOrder.oficina_id == user.oficina_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    part = db.query(Part).filter(Part.id == payload.part_id, Part.oficina_id == user.oficina_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    if part.quantidade < payload.quantidade:
        raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {part.quantidade}")
    part.quantidade -= payload.quantidade
    op = OrderPart(
        order_id=order_id,
        part_id=payload.part_id,
        quantidade=payload.quantidade,
        preco_unitario=part.preco_venda,
    )
    db.add(op)
    _recalc_total(order, db)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to add part to order")
    db.refresh(op)
    return {"ok": True, "part_id": payload.part_id, "quantidade": payload.quantidade, "remaining_stock": part.quantidade}


@router.post("/{order_id}/services")
def add_service_to_order(order_id: int, payload: OrderServiceCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id, ServiceOrder.oficina_id == user.oficina_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    svc = db.query(Service).filter(Service.id == payload.service_id, Service.oficina_id == user.oficina_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    osv = OrderService(
        order_id=order_id,
        service_id=payload.service_id,
        valor_cobrado=svc.valor_mao_obra,
    )
    db.add(osv)
    _recalc_total(order, db)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to add service to order")
    db.refresh(osv)
    return {"ok": True, "service_id": payload.service_id, "valor_cobrado": svc.valor_mao_obra}


@router.delete("/{order_id}/parts/{order_part_id}")
def remove_part_from_order(order_id: int, order_part_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id, ServiceOrder.oficina_id == user.oficina_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    op = db.query(OrderPart).filter(OrderPart.id == order_part_id, OrderPart.order_id == order_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Order part not found")
    part = db.query(Part).filter(Part.id == op.part_id, Part.oficina_id == user.oficina_id).first()
    if part:
        part.quantidade += op.quantidade
    db.delete(op)
    _recalc_total(order, db)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to remove part from order")
    return {"ok": True}


@router.delete("/{order_id}/services/{order_service_id}")
def remove_service_from_order(order_id: int, order_service_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id, ServiceOrder.oficina_id == user.oficina_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    osv = db.query(OrderService).filter(OrderService.id == order_service_id, OrderService.order_id == order_id).first()
    if not osv:
        raise HTTPException(status_code=404, detail="Order service not found")
    db.delete(osv)
    _recalc_total(order, db)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to remove service from order")
    return {"ok": True}


@router.patch("/{order_id}", response_model=dict)
def update_order(order_id: int, payload: ServiceOrderUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id, ServiceOrder.oficina_id == user.oficina_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if payload.aguardando_peca is not None:
        order.aguardando_peca = 1 if payload.aguardando_peca else 0
    if payload.status:
        if payload.status not in [e.value for e in OSStatus]:
            raise HTTPException(status_code=400, detail=f"Invalid status. Use: {[e.value for e in OSStatus]}")
        order.status = payload.status
    db.commit()
    return {"ok": True}


@router.post("/{order_id}/status")
def update_status(order_id: int, status: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id, ServiceOrder.oficina_id == user.oficina_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if status not in [e.value for e in OSStatus]:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use: {[e.value for e in OSStatus]}")
    old_status = order.status
    order.status = status

    # Registrar mudança de status no histórico
    history_entry = StatusHistory(
        order_id=order.id,
        status=status,
        user_id=user.id,
    )
    db.add(history_entry)

    if status == OSStatus.FINALIZADA.value and old_status != OSStatus.FINALIZADA.value:
        t = Transaction(
            oficina_id=user.oficina_id,
            tipo="entrada",
            descricao=f"OS #{order.id} finalizada",
            valor=order.valor_total,
            referencia_id=order.id,
        )
        db.add(t)

    db.commit()
    return {"ok": True}


@router.get("/public/{token}", response_model=ServiceOrderOut)
def get_order_public(token: str, db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.orcamento_token == token).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _order_to_dict(order)


@router.post("/public/{token}/approve")
def approve_orcamento(token: str, db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.orcamento_token == token).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.orcamento_status = OrcamentoStatus.APROVADO.value
    order.status = OSStatus.EM_ANDAMENTO.value
    db.commit()
    return {"ok": True, "status": order.orcamento_status}


@router.post("/public/{token}/reject")
def reject_orcamento(token: str, db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.orcamento_token == token).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.orcamento_status = OrcamentoStatus.REPROVADO.value
    order.status = OSStatus.CANCELADA.value
    db.commit()
    return {"ok": True, "status": order.orcamento_status}


@router.post("/{order_id}/notify-ready")
def notify_order_ready(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(
        ServiceOrder.id == order_id,
        ServiceOrder.oficina_id == user.oficina_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    cliente = db.query(Cliente).filter(Cliente.id == order.cliente_id).first()
    vehicle = db.query(Vehicle).filter(Vehicle.id == order.vehicle_id).first()
    telefone_oficina = user.telefone_oficina or ""

    mensagem_whatsapp = (
        f"Olá {cliente.nome}, seu {vehicle.marca} {vehicle.modelo} está pronto! "
        f"Aguardamos você. Qualquer dúvida: {telefone_oficina}"
    )

    return {
        "mensagem_whatsapp": mensagem_whatsapp,
        "cliente_nome": cliente.nome,
        "veiculo": f"{vehicle.marca} {vehicle.modelo}",
        "telefone_oficina": telefone_oficina,
    }
