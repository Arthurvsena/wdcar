import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, ServiceOrder, Transaction, Cliente, Part, OrderPart, OSStatus
from auth import get_current_user
from permissions import require_permission

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(require_permission("relatorios"))])


def _escape_csv(val):
    if isinstance(val, str) and val.startswith(('=', '+', '-', '@')):
        return "'" + val
    return val


def _parse_range(data_inicio: str = None, data_fim: str = None):
    dt_inicio = None
    dt_fim = None
    if data_inicio:
        try:
            dt_inicio = datetime.strptime(data_inicio, "%Y-%m-%d")
        except ValueError:
            pass
    if data_fim:
        try:
            dt_fim = datetime.strptime(data_fim, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        except ValueError:
            pass
    return dt_inicio, dt_fim


@router.get("/os")
def report_os(data_inicio: str = None, data_fim: str = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dt_inicio, dt_fim = _parse_range(data_inicio, data_fim)
    query = db.query(ServiceOrder).filter(ServiceOrder.oficina_id == user.oficina_id)
    if dt_inicio:
        query = query.filter(ServiceOrder.created_at >= dt_inicio)
    if dt_fim:
        query = query.filter(ServiceOrder.created_at <= dt_fim)
    orders = query.all()
    por_status = {}
    for o in orders:
        por_status[o.status] = por_status.get(o.status, 0) + 1
    return {
        "total": len(orders),
        "valor_total": sum(o.valor_total for o in orders),
        "por_status": por_status,
    }


@router.get("/financeiro")
def report_financeiro(data_inicio: str = None, data_fim: str = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dt_inicio, dt_fim = _parse_range(data_inicio, data_fim)
    query = db.query(Transaction).filter(Transaction.oficina_id == user.oficina_id)
    if dt_inicio:
        query = query.filter(Transaction.created_at >= dt_inicio)
    if dt_fim:
        query = query.filter(Transaction.created_at <= dt_fim)
    transactions = query.all()
    total_in = sum(t.valor for t in transactions if t.tipo == "entrada")
    total_out = sum(t.valor for t in transactions if t.tipo == "saida")
    return {
        "total_entradas": total_in,
        "total_saidas": total_out,
        "saldo": total_in - total_out,
        "quantidade": len(transactions),
    }


@router.get("/clientes")
def report_clientes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(
            Cliente.id,
            Cliente.nome,
            func.count(ServiceOrder.id).label("total_os"),
            func.coalesce(func.sum(ServiceOrder.valor_total), 0).label("total_gasto"),
        )
        .outerjoin(ServiceOrder, ServiceOrder.cliente_id == Cliente.id)
        .filter(Cliente.oficina_id == user.oficina_id)
        .group_by(Cliente.id)
        .order_by(func.coalesce(func.sum(ServiceOrder.valor_total), 0).desc())
        .all()
    )
    return {
        "items": [
            {"cliente_id": r.id, "nome": r.nome, "total_os": r.total_os, "total_gasto": float(r.total_gasto)}
            for r in rows
        ]
    }


@router.get("/pecas")
def report_pecas(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    parts = db.query(Part).filter(Part.oficina_id == user.oficina_id).all()
    mais_usadas = (
        db.query(Part.nome, func.sum(OrderPart.quantidade).label("total"))
        .join(OrderPart, OrderPart.part_id == Part.id)
        .join(ServiceOrder, OrderPart.order_id == ServiceOrder.id)
        .filter(ServiceOrder.oficina_id == user.oficina_id)
        .group_by(Part.id)
        .order_by(func.sum(OrderPart.quantidade).desc())
        .limit(10)
        .all()
    )
    return {
        "total_pecas": len(parts),
        "valor_estoque": sum(p.preco_compra * p.quantidade for p in parts),
        "baixo_estoque": sum(1 for p in parts if p.estoque_minimo and p.quantidade <= p.estoque_minimo),
        "mais_usadas": [{"nome": r.nome, "total": r.total} for r in mais_usadas],
    }


@router.get("/export/{tipo}")
def export_csv(tipo: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)

    if tipo == "os":
        writer.writerow(["ID", "Cliente", "Status", "Valor Total", "Criada em"])
        orders = db.query(ServiceOrder).filter(ServiceOrder.oficina_id == user.oficina_id).all()
        for o in orders:
            writer.writerow([o.id, _escape_csv(o.cliente.nome if o.cliente else ""), o.status, f"{o.valor_total:.2f}", o.created_at.strftime("%Y-%m-%d %H:%M") if o.created_at else ""])
    elif tipo == "financeiro":
        writer.writerow(["ID", "Tipo", "Descricao", "Valor", "Data"])
        transactions = db.query(Transaction).filter(Transaction.oficina_id == user.oficina_id).all()
        for t in transactions:
            writer.writerow([t.id, t.tipo, _escape_csv(t.descricao) if t.descricao else "", f"{t.valor:.2f}", t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else ""])
    elif tipo == "clientes":
        writer.writerow(["ID", "Nome", "Total OS", "Total Gasto"])
        rows = (
            db.query(Cliente.id, Cliente.nome, func.count(ServiceOrder.id), func.coalesce(func.sum(ServiceOrder.valor_total), 0))
            .outerjoin(ServiceOrder, ServiceOrder.cliente_id == Cliente.id)
            .filter(Cliente.oficina_id == user.oficina_id)
            .group_by(Cliente.id)
            .all()
        )
        for r in rows:
            writer.writerow([r[0], _escape_csv(r[1]), r[2], f"{float(r[3]):.2f}"])
    elif tipo == "pecas":
        writer.writerow(["ID", "Nome", "Codigo", "Quantidade", "Preco Venda"])
        parts = db.query(Part).filter(Part.oficina_id == user.oficina_id).all()
        for p in parts:
            writer.writerow([p.id, _escape_csv(p.nome), p.codigo or "", p.quantidade, f"{p.preco_venda:.2f}"])
    else:
        raise HTTPException(status_code=400, detail="Invalid report type. Use: os, financeiro, clientes, pecas")

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={tipo}.csv"}
    )
