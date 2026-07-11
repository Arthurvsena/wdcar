from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import User, Cliente, Vehicle, ServiceOrder, Part
from auth import get_current_user
from permissions import get_user_modules

router = APIRouter(prefix="/search", tags=["search"])

LIMIT_POR_GRUPO = 5


@router.get("")
def global_search(q: str = "", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.is_dev or user.role == "dev":
        raise HTTPException(status_code=403, detail="Developers cannot access workshop data")

    q = (q or "").strip()
    result = {"clientes": [], "veiculos": [], "ordens": [], "pecas": []}
    if len(q) < 2:
        return result

    modules = get_user_modules(user)
    like = f"%{q}%"
    ofid = user.oficina_id

    if "clientes" in modules:
        clientes = (
            db.query(Cliente)
            .filter(
                Cliente.oficina_id == ofid,
                or_(Cliente.nome.ilike(like), Cliente.telefone.ilike(like), Cliente.cpf_cnpj.ilike(like)),
            )
            .limit(LIMIT_POR_GRUPO)
            .all()
        )
        result["clientes"] = [
            {"id": c.id, "nome": c.nome, "telefone": c.telefone} for c in clientes
        ]

    if "historico" in modules or "os" in modules:
        veiculos = (
            db.query(Vehicle)
            .options(joinedload(Vehicle.cliente))
            .filter(
                Vehicle.oficina_id == ofid,
                or_(Vehicle.placa.ilike(like), Vehicle.modelo.ilike(like), Vehicle.marca.ilike(like)),
            )
            .limit(LIMIT_POR_GRUPO)
            .all()
        )
        result["veiculos"] = [
            {
                "id": v.id,
                "placa": v.placa,
                "modelo": f"{v.marca} {v.modelo}",
                "cliente": v.cliente.nome if v.cliente else None,
            }
            for v in veiculos
        ]

    if "os" in modules:
        os_query = db.query(ServiceOrder).options(
            joinedload(ServiceOrder.cliente), joinedload(ServiceOrder.vehicle)
        ).filter(ServiceOrder.oficina_id == ofid)
        digits = q.lstrip("#")
        if digits.isdigit():
            os_query = os_query.filter(ServiceOrder.id == int(digits))
        else:
            os_query = os_query.join(Vehicle, ServiceOrder.vehicle_id == Vehicle.id).join(
                Cliente, ServiceOrder.cliente_id == Cliente.id
            ).filter(or_(Vehicle.placa.ilike(like), Cliente.nome.ilike(like)))
        ordens = os_query.order_by(ServiceOrder.id.desc()).limit(LIMIT_POR_GRUPO).all()
        result["ordens"] = [
            {
                "id": o.id,
                "status": o.status,
                "cliente": o.cliente.nome if o.cliente else None,
                "veiculo": f"{o.vehicle.marca} {o.vehicle.modelo}" if o.vehicle else None,
                "placa": o.vehicle.placa if o.vehicle else None,
            }
            for o in ordens
        ]

    if "pecas" in modules:
        pecas = (
            db.query(Part)
            .filter(
                Part.oficina_id == ofid,
                or_(Part.nome.ilike(like), Part.codigo.ilike(like)),
            )
            .limit(LIMIT_POR_GRUPO)
            .all()
        )
        result["pecas"] = [
            {"id": p.id, "nome": p.nome, "codigo": p.codigo, "quantidade": p.quantidade} for p in pecas
        ]

    return result
