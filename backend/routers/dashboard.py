from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, Cliente, Vehicle, ServiceOrder, OrderPart, OrderService, Part, Service, OSStatus
from auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/metrics")
def get_metrics(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ofid = user.oficina_id

    total_clientes = db.query(Cliente).filter(Cliente.oficina_id == ofid).count()
    total_os = db.query(ServiceOrder).filter(ServiceOrder.oficina_id == ofid).count()
    os_abertas = (
        db.query(ServiceOrder)
        .filter(
            ServiceOrder.oficina_id == ofid,
            ServiceOrder.status.in_([OSStatus.ABERTA.value, OSStatus.EM_ANDAMENTO.value]),
        )
        .count()
    )
    os_finalizadas = (
        db.query(ServiceOrder)
        .filter(ServiceOrder.oficina_id == ofid, ServiceOrder.status == OSStatus.FINALIZADA.value)
        .count()
    )

    reincidentes = (
        db.query(
            Vehicle.marca,
            Vehicle.modelo,
            Cliente.nome,
            func.count(ServiceOrder.id).label("total_os"),
        )
        .join(Vehicle, ServiceOrder.vehicle_id == Vehicle.id)
        .join(Cliente, ServiceOrder.cliente_id == Cliente.id)
        .filter(ServiceOrder.oficina_id == ofid)
        .group_by(Vehicle.id, Cliente.id)
        .having(func.count(ServiceOrder.id) > 1)
        .order_by(func.count(ServiceOrder.id).desc())
        .limit(10)
        .all()
    )

    marcas_mais_atendidas = (
        db.query(Vehicle.marca, func.count(ServiceOrder.id).label("total"))
        .join(Vehicle, ServiceOrder.vehicle_id == Vehicle.id)
        .filter(ServiceOrder.oficina_id == ofid)
        .group_by(Vehicle.marca)
        .order_by(func.count(ServiceOrder.id).desc())
        .limit(10)
        .all()
    )

    pecas_mais_usadas = (
        db.query(Part.nome, func.sum(OrderPart.quantidade).label("total"))
        .join(Part, OrderPart.part_id == Part.id)
        .join(ServiceOrder, OrderPart.order_id == ServiceOrder.id)
        .filter(ServiceOrder.oficina_id == ofid)
        .group_by(Part.id)
        .order_by(func.sum(OrderPart.quantidade).desc())
        .limit(10)
        .all()
    )

    servicos_mais_usados = (
        db.query(Service.nome, func.count(OrderService.id).label("total"))
        .join(Service, OrderService.service_id == Service.id)
        .join(ServiceOrder, OrderService.order_id == ServiceOrder.id)
        .filter(ServiceOrder.oficina_id == ofid)
        .group_by(Service.id)
        .order_by(func.count(OrderService.id).desc())
        .limit(10)
        .all()
    )

    start_of_month = datetime.now(timezone.utc).replace(day=1)

    faturamento_mes = (
        db.query(func.sum(ServiceOrder.valor_total))
        .filter(
            ServiceOrder.oficina_id == ofid,
            ServiceOrder.status == OSStatus.FINALIZADA.value,
            ServiceOrder.updated_at >= start_of_month,
        )
        .scalar()
    ) or 0

    os_espera = (
        db.query(ServiceOrder)
        .filter(
            ServiceOrder.oficina_id == ofid,
            ServiceOrder.aguardando_peca == 1,
            ServiceOrder.status.in_([OSStatus.ABERTA.value, OSStatus.EM_ANDAMENTO.value]),
        )
        .count()
    )

    total_pecas = (
        db.query(func.sum(Part.quantidade))
        .filter(Part.oficina_id == ofid)
        .scalar()
    ) or 0

    return {
        "total_clientes": total_clientes,
        "total_os": total_os,
        "os_abertas": os_abertas,
        "os_finalizadas": os_finalizadas,
        "faturamento_mes": faturamento_mes,
        "os_espera": os_espera,
        "total_pecas": total_pecas,
        "reincidentes": [
            {"marca": r.marca, "modelo": r.modelo, "nome": r.nome, "total_os": r.total_os}
            for r in reincidentes
        ],
        "marcas_mais_atendidas": [
            {"marca": r.marca, "total": r.total} for r in marcas_mais_atendidas
        ],
        "pecas_mais_usadas": [
            {"nome": r.nome, "total": r.total} for r in pecas_mais_usadas
        ],
        "servicos_mais_usados": [
            {"nome": r.nome, "total": r.total} for r in servicos_mais_usados
        ],
    }
