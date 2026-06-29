from datetime import datetime, timedelta
from io import StringIO
import csv

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import User, Transaction, ServiceOrder, Part, Cliente, OSStatus, OrderPart, OrderService
from auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


def _parse_date_range(start_date: str = None, end_date: str = None):
    start = None
    end = None
    try:
        if start_date:
            start = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD")
    return start, end


def _apply_date_filter(query, model_field, start, end):
    if start:
        query = query.filter(model_field >= start)
    if end:
        query = query.filter(model_field <= end)
    return query


def _simple_pdf(title: str, lines: list) -> bytes:
    """Generate a valid minimal PDF file from title and text lines."""
    content_stream = f"BT\n/F1 18 Tf\n72 750 Td\n({title}) Tj\nET\n"
    y = 720
    for line in lines:
        if y < 50:
            content_stream += f"BT\n/F1 10 Tf\n72 750 Td\n({title} - continuacao) Tj\nET\n"
            y = 720
        safe = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        content_stream += f"BT\n/F1 10 Tf\n72 {y} Td\n({safe}) Tj\nET\n"
        y -= 14

    objects = []
    objects.append("1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj")
    objects.append("2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj")
    objects.append("3 0 obj\n<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>\nendobj")
    objects.append(f"4 0 obj\n<</Length {len(content_stream)}>>\nstream\n{content_stream}endstream\nendobj")
    objects.append("5 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>\nendobj")

    pdf = "%PDF-1.4\n"
    offsets = []
    for obj in objects:
        offsets.append(len(pdf.encode('latin-1', errors='replace')))
        pdf += obj + "\n"

    xref_offset = len(pdf.encode('latin-1', errors='replace'))
    pdf += "xref\n"
    pdf += f"0 {len(objects) + 1}\n"
    pdf += "[REDACTED] 65535 f \n"
    for off in offsets:
        pdf += f"{off:010d} 00000 n \n"
    pdf += "trailer\n"
    pdf += f"<</Size {len(objects) + 1}/Root 1 0 R>>\n"
    pdf += "startxref\n"
    pdf += f"{xref_offset}\n"
    pdf += "%%EOF"

    return pdf.encode('latin-1', errors='replace')


@router.get("/financial")
def financial_report(
    start_date: str = Query(None),
    end_date: str = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ofid = user.oficina_id
    start, end = _parse_date_range(start_date, end_date)

    base = db.query(Transaction).filter(Transaction.oficina_id == ofid)
    base = _apply_date_filter(base, Transaction.created_at, start, end)

    total_income = (
        base.filter(Transaction.tipo == "entrada")
        .with_entities(func.sum(Transaction.valor))
        .scalar()
        or 0
    )
    total_expenses = (
        base.filter(Transaction.tipo == "saida")
        .with_entities(func.sum(Transaction.valor))
        .scalar()
        or 0
    )

    incomes_by_desc = (
        db.query(
            Transaction.descricao,
            func.sum(Transaction.valor).label("valor"),
            func.count(Transaction.id).label("quantidade"),
        )
        .filter(
            Transaction.oficina_id == ofid,
            Transaction.tipo == "entrada",
        )
        .filter(Transaction.created_at >= start if start else True)
        .filter(Transaction.created_at <= end if end else True)
        .group_by(Transaction.descricao)
        .order_by(func.sum(Transaction.valor).desc())
        .all()
    )

    expenses_by_desc = (
        db.query(
            Transaction.descricao,
            func.sum(Transaction.valor).label("valor"),
            func.count(Transaction.id).label("quantidade"),
        )
        .filter(
            Transaction.oficina_id == ofid,
            Transaction.tipo == "saida",
        )
        .filter(Transaction.created_at >= start if start else True)
        .filter(Transaction.created_at <= end if end else True)
        .group_by(Transaction.descricao)
        .order_by(func.sum(Transaction.valor).desc())
        .all()
    )

    daily = (
        db.query(
            func.strftime("%Y-%m-%d", Transaction.created_at).label("date"),
            func.sum(Transaction.valor).filter(Transaction.tipo == "entrada").label("income"),
            func.sum(Transaction.valor).filter(Transaction.tipo == "saida").label("expense"),
        )
        .filter(Transaction.oficina_id == ofid)
        .filter(Transaction.created_at >= start if start else True)
        .filter(Transaction.created_at <= end if end else True)
        .group_by(func.strftime("%Y-%m-%d", Transaction.created_at))
        .order_by(func.strftime("%Y-%m-%d", Transaction.created_at))
        .all()
    )

    return {
        "period": {
            "start": start_date,
            "end": end_date,
        },
        "total_receitas": round(float(total_income), 2),
        "total_despesas": round(float(total_expenses), 2),
        "saldo": round(float(total_income) - float(total_expenses), 2),
        "categorias": {
            "incomes": [
                {
                    "descricao": r.descricao,
                    "valor": round(float(r.valor), 2),
                    "quantidade": r.quantidade,
                }
                for r in incomes_by_desc
            ],
            "expenses": [
                {
                    "descricao": r.descricao,
                    "valor": round(float(r.valor), 2),
                    "quantidade": r.quantidade,
                }
                for r in expenses_by_desc
            ],
        },
        "diario": [
            {
                "date": r.date,
                "income": round(float(r.income or 0), 2),
                "expense": round(float(r.expense or 0), 2),
            }
            for r in daily
        ],
    }


@router.get("/orders")
def orders_report(
    start_date: str = Query(None),
    end_date: str = Query(None),
    client_id: int = Query(None),
    vehicle_id: int = Query(None),
    status: str = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ofid = user.oficina_id
    start, end = _parse_date_range(start_date, end_date)

    base = db.query(ServiceOrder).filter(ServiceOrder.oficina_id == ofid)
    base = _apply_date_filter(base, ServiceOrder.created_at, start, end)

    if client_id:
        base = base.filter(ServiceOrder.cliente_id == client_id)
    if vehicle_id:
        base = base.filter(ServiceOrder.vehicle_id == vehicle_id)
    if status:
        base = base.filter(ServiceOrder.status == status)

    total_orders = base.count()

    by_status_q = (
        db.query(
            ServiceOrder.status,
            func.count(ServiceOrder.id).label("total"),
        )
        .filter(ServiceOrder.oficina_id == ofid)
        .filter(ServiceOrder.created_at >= start if start else True)
        .filter(ServiceOrder.created_at <= end if end else True)
    )
    if client_id:
        by_status_q = by_status_q.filter(ServiceOrder.cliente_id == client_id)
    if vehicle_id:
        by_status_q = by_status_q.filter(ServiceOrder.vehicle_id == vehicle_id)
    if status:
        by_status_q = by_status_q.filter(ServiceOrder.status == status)
    by_status = by_status_q.group_by(ServiceOrder.status).all()

    total_revenue = (
        base.filter(ServiceOrder.status == OSStatus.FINALIZADA.value)
        .with_entities(func.sum(ServiceOrder.valor_total))
        .scalar()
        or 0
    )

    finalized_count = (
        base.filter(ServiceOrder.status == OSStatus.FINALIZADA.value).count()
    )
    average_ticket = round(float(total_revenue) / finalized_count, 2) if finalized_count > 0 else 0.0

    orders_q = (
        db.query(ServiceOrder)
        .filter(ServiceOrder.oficina_id == ofid)
        .filter(ServiceOrder.created_at >= start if start else True)
        .filter(ServiceOrder.created_at <= end if end else True)
    )
    if client_id:
        orders_q = orders_q.filter(ServiceOrder.cliente_id == client_id)
    if vehicle_id:
        orders_q = orders_q.filter(ServiceOrder.vehicle_id == vehicle_id)
    if status:
        orders_q = orders_q.filter(ServiceOrder.status == status)

    orders = (
        orders_q
        .options(
            selectinload(ServiceOrder.parts_used).selectinload(OrderPart.part),
            selectinload(ServiceOrder.services_used).selectinload(OrderService.service),
        )
        .order_by(ServiceOrder.created_at.desc())
        .all()
    )

    orders_data = []
    for o in orders:
        cliente_nome = ""
        vehicle_info = ""
        if o.cliente:
            cliente_nome = o.cliente.nome
        if o.vehicle:
            parts = []
            if o.vehicle.marca:
                parts.append(o.vehicle.marca)
            if o.vehicle.modelo:
                parts.append(o.vehicle.modelo)
            if o.vehicle.ano:
                parts.append(str(o.vehicle.ano))
            vehicle_str = " ".join(parts)
            if o.vehicle.placa:
                vehicle_str += f" - {o.vehicle.placa}"
            vehicle_info = vehicle_str
        orders_data.append({
            "id": o.id,
            "cliente_nome": cliente_nome,
            "vehicle_info": vehicle_info,
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "valor_total": round(float(o.valor_total or 0), 2),
            "parts": [
                {
                    "nome": op.part.nome if op.part else "",
                    "quantidade": op.quantidade,
                    "preco_unitario": round(float(op.preco_unitario or 0), 2),
                    "subtotal": round(float((op.quantidade or 0) * (op.preco_unitario or 0)), 2),
                }
                for op in o.parts_used
            ],
            "services": [
                {
                    "nome": osv.service.nome if osv.service else "",
                    "valor_cobrado": round(float(osv.valor_cobrado or 0), 2),
                }
                for osv in o.services_used
            ],
        })

    by_status_dict = {r.status: r.total for r in by_status}

    return {
        "period": {
            "start": start_date,
            "end": end_date,
        },
        "total_os": total_orders,
        "por_status": by_status_dict,
        "receita_total": round(float(total_revenue), 2),
        "ticket_medio": average_ticket,
        "ordens": orders_data,
    }


@router.get("/stock")
def stock_report(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ofid = user.oficina_id

    total_parts = (
        db.query(func.count(Part.id))
        .filter(Part.oficina_id == ofid)
        .scalar()
        or 0
    )

    low_stock_items = (
        db.query(Part)
        .filter(
            Part.oficina_id == ofid,
            Part.estoque_minimo.isnot(None),
            Part.quantidade < Part.estoque_minimo,
        )
        .order_by(Part.quantidade.asc())
        .all()
    )

    total_stock_value = (
        db.query(func.sum(Part.quantidade * Part.preco_compra))
        .filter(Part.oficina_id == ofid)
        .scalar()
        or 0
    )

    zero_stock_count = (
        db.query(func.count(Part.id))
        .filter(
            Part.oficina_id == ofid,
            Part.quantidade == 0,
        )
        .scalar()
        or 0
    )

    return {
        "total_pecas": total_parts,
        "alertas": [
            {
                "id": p.id,
                "nome": p.nome,
                "quantidade": p.quantidade,
                "estoque_minimo": p.estoque_minimo,
                "diferenca": p.quantidade - p.estoque_minimo,
            }
            for p in low_stock_items
        ],
        "valor_total": round(float(total_stock_value), 2),
        "estoque_zero": zero_stock_count,
    }


@router.get("/clients")
def clients_report(
    start_date: str = Query(None),
    end_date: str = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ofid = user.oficina_id
    start, end = _parse_date_range(start_date, end_date)

    total_clients = (
        db.query(func.count(Cliente.id))
        .filter(Cliente.oficina_id == ofid)
        .scalar()
        or 0
    )

    new_clients = db.query(Cliente).filter(Cliente.oficina_id == ofid)
    new_clients = _apply_date_filter(new_clients, Cliente.created_at, start, end)
    new_clients_period = new_clients.count()

    top_clients = (
        db.query(
            Cliente.id,
            Cliente.nome,
            Cliente.telefone,
            func.count(ServiceOrder.id).label("total_orders"),
            func.sum(ServiceOrder.valor_total).label("total_spent"),
            func.max(ServiceOrder.created_at).label("last_visit"),
            func.min(ServiceOrder.created_at).label("first_visit"),
        )
        .join(ServiceOrder, ServiceOrder.cliente_id == Cliente.id)
        .filter(Cliente.oficina_id == ofid)
        .filter(ServiceOrder.created_at >= start if start else True)
        .filter(ServiceOrder.created_at <= end if end else True)
        .group_by(Cliente.id)
        .order_by(func.count(ServiceOrder.id).desc())
        .limit(10)
        .all()
    )

    top_client_ids = [r.id for r in top_clients]

    top_parts_values = {}
    if top_client_ids:
        parts_agg = (
            db.query(
                ServiceOrder.cliente_id,
                func.sum(OrderPart.quantidade * OrderPart.preco_unitario).label("total_parts_value"),
            )
            .join(OrderPart, OrderPart.order_id == ServiceOrder.id)
            .filter(ServiceOrder.cliente_id.in_(top_client_ids))
            .group_by(ServiceOrder.cliente_id)
            .all()
        )
        for row in parts_agg:
            top_parts_values[row.cliente_id] = round(float(row.total_parts_value or 0), 2)

    top_services_values = {}
    if top_client_ids:
        services_agg = (
            db.query(
                ServiceOrder.cliente_id,
                func.sum(OrderService.valor_cobrado).label("total_services_value"),
            )
            .join(OrderService, OrderService.order_id == ServiceOrder.id)
            .filter(ServiceOrder.cliente_id.in_(top_client_ids))
            .group_by(ServiceOrder.cliente_id)
            .all()
        )
        for row in services_agg:
            top_services_values[row.cliente_id] = round(float(row.total_services_value or 0), 2)

    all_clients_rows = (
        db.query(
            Cliente.id,
            Cliente.nome,
            Cliente.telefone,
            func.count(ServiceOrder.id).label("total_orders"),
            func.sum(ServiceOrder.valor_total).label("total_spent"),
            func.max(ServiceOrder.created_at).label("last_visit"),
        )
        .join(ServiceOrder, ServiceOrder.cliente_id == Cliente.id)
        .filter(Cliente.oficina_id == ofid)
        .group_by(Cliente.id)
        .order_by(func.count(ServiceOrder.id).desc())
        .all()
    )

    return {
        "total_clients": total_clients,
        "top10": [
            {
                "id": r.id,
                "nome": r.nome,
                "telefone": r.telefone,
                "total_orders": r.total_orders,
                "total_spent": round(float(r.total_spent or 0), 2),
                "last_visit": r.last_visit.isoformat() if r.last_visit else None,
                "total_parts_value": top_parts_values.get(r.id, 0.0),
                "total_services_value": top_services_values.get(r.id, 0.0),
                "average_order_value": round(float(r.total_spent or 0) / r.total_orders, 2) if r.total_orders else 0.0,
                "first_visit": r.first_visit.isoformat() if r.first_visit else None,
            }
            for r in top_clients
        ],
        "all_clients": [
            {
                "id": r.id,
                "nome": r.nome,
                "telefone": r.telefone,
                "total_orders": r.total_orders,
                "total_spent": round(float(r.total_spent or 0), 2),
                "last_visit": r.last_visit.isoformat() if r.last_visit else None,
            }
            for r in all_clients_rows
        ],
        "novos_periodo": new_clients_period,
    }


@router.get("/profitability")
def profitability_report(
    start_date: str = Query(None),
    end_date: str = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ofid = user.oficina_id
    start, end = _parse_date_range(start_date, end_date)

    query = (
        db.query(
            Part.id,
            Part.nome,
            Part.codigo,
            func.sum(OrderPart.quantidade).label("qty_sold"),
            func.sum(OrderPart.quantidade * OrderPart.preco_unitario).label("total_revenue"),
            func.sum(OrderPart.quantidade * Part.preco_compra).label("total_cost"),
        )
        .join(OrderPart, OrderPart.part_id == Part.id)
        .join(ServiceOrder, ServiceOrder.id == OrderPart.order_id)
        .filter(Part.oficina_id == ofid)
    )

    if start:
        query = query.filter(ServiceOrder.created_at >= start)
    if end:
        query = query.filter(ServiceOrder.created_at <= end)

    query = query.group_by(Part.id)

    rows = query.all()

    parts_data = []
    total_revenue = 0.0
    total_cost = 0.0
    for r in rows:
        revenue = round(float(r.total_revenue or 0), 2)
        cost = round(float(r.total_cost or 0), 2)
        profit = round(revenue - cost, 2)
        margin = round(profit / revenue * 100, 2) if revenue > 0 else 0.0
        total_revenue += revenue
        total_cost += cost
        parts_data.append({
            "id": r.id,
            "nome": r.nome,
            "codigo": r.codigo,
            "qty_sold": int(r.qty_sold or 0),
            "total_revenue": revenue,
            "total_cost": cost,
            "profit": profit,
            "margin": margin,
        })

    parts_data.sort(key=lambda x: x["profit"], reverse=True)

    total_profit = round(total_revenue - total_cost, 2)
    average_margin = round(total_profit / total_revenue * 100, 2) if total_revenue > 0 else 0.0

    return {
        "period": {"start": start_date, "end": end_date},
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_cost": round(total_cost, 2),
            "total_profit": total_profit,
            "average_margin": average_margin,
        },
        "parts": parts_data,
    }


@router.get("/stock-evolution")
def stock_evolution(
    start_date: str = Query(None),
    end_date: str = Query(None),
    part_id: int = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ofid = user.oficina_id
    start, end = _parse_date_range(start_date, end_date)

    query = (
        db.query(
            ServiceOrder.created_at.label("date"),
            Part.id.label("part_id"),
            Part.nome.label("part_nome"),
            OrderPart.quantidade.label("quantidade"),
            ServiceOrder.id.label("order_id"),
        )
        .join(OrderPart, OrderPart.order_id == ServiceOrder.id)
        .join(Part, Part.id == OrderPart.part_id)
        .filter(Part.oficina_id == ofid)
    )

    if start:
        query = query.filter(ServiceOrder.created_at >= start)
    if end:
        query = query.filter(ServiceOrder.created_at <= end)
    if part_id:
        query = query.filter(Part.id == part_id)

    query = query.order_by(ServiceOrder.created_at.desc())

    rows = query.all()

    movements = []
    for r in rows:
        movements.append({
            "date": r.date.isoformat() if r.date else None,
            "part_id": r.part_id,
            "part_nome": r.part_nome,
            "quantidade": -abs(r.quantidade),
            "tipo": "saida",
            "referencia": f"OS #{r.order_id}",
        })

    return {
        "period": {"start": start_date, "end": end_date},
        "movements": movements,
        "summary": {
            "total_movements": len(movements),
            "parts_affected": len({m["part_id"] for m in movements}),
        },
    }


def _escape_csv(val):
    if isinstance(val, str) and val.startswith(("=", "+", "-", "@")):
        return "'" + val
    return val


@router.get("/export/{report_type}")
def export_report(
    report_type: str,
    start_date: str = Query(None),
    end_date: str = Query(None),
    client_id: int = Query(None),
    vehicle_id: int = Query(None),
    status: str = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if report_type not in ("financial", "orders", "stock", "clients", "profitability", "stock_evolution"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid report type. Use: financial, orders, stock, clients, profitability, stock_evolution")

    output = StringIO()
    writer = csv.writer(output)

    if report_type == "financial":
        writer.writerow(["Tipo", "Descricao", "Valor", "Data"])
        start, end = _parse_date_range(start_date, end_date)
        transactions = (
            db.query(Transaction)
            .filter(Transaction.oficina_id == user.oficina_id)
            .order_by(Transaction.created_at.desc())
        )
        transactions = _apply_date_filter(transactions, Transaction.created_at, start, end)
        for t in transactions.all():
            writer.writerow([
                t.tipo,
                _escape_csv(t.descricao) if t.descricao else "",
                f"{t.valor:.2f}",
                t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else "",
            ])
        filename = "relatorio_financeiro.csv"

    elif report_type == "orders":
        writer.writerow(["ID", "Cliente", "Veiculo", "Status", "Valor Total", "Data", "Pecas", "Servicos"])
        start, end = _parse_date_range(start_date, end_date)
        orders_q = (
            db.query(ServiceOrder)
            .filter(ServiceOrder.oficina_id == user.oficina_id)
            .options(
                selectinload(ServiceOrder.parts_used).selectinload(OrderPart.part),
                selectinload(ServiceOrder.services_used).selectinload(OrderService.service),
            )
        )
        orders_q = _apply_date_filter(orders_q, ServiceOrder.created_at, start, end)
        if client_id:
            orders_q = orders_q.filter(ServiceOrder.cliente_id == client_id)
        if vehicle_id:
            orders_q = orders_q.filter(ServiceOrder.vehicle_id == vehicle_id)
        if status:
            orders_q = orders_q.filter(ServiceOrder.status == status)
        for o in orders_q.order_by(ServiceOrder.created_at.desc()).all():
            veiculo = ""
            if o.vehicle:
                vparts = [p for p in [o.vehicle.marca, o.vehicle.modelo] if p]
                veiculo = " ".join(vparts)
            parts_str = "; ".join(
                f"{op.part.nome if op.part else '?'} x{op.quantidade} @ {op.preco_unitario:.2f}"
                for op in o.parts_used
            ) if o.parts_used else ""
            services_str = "; ".join(
                f"{osv.service.nome if osv.service else '?'} @ {osv.valor_cobrado:.2f}"
                for osv in o.services_used
            ) if o.services_used else ""
            writer.writerow([
                o.id,
                _escape_csv(o.cliente.nome) if o.cliente else "",
                _escape_csv(veiculo),
                o.status,
                f"{o.valor_total:.2f}" if o.valor_total else "0.00",
                o.created_at.strftime("%Y-%m-%d %H:%M") if o.created_at else "",
                _escape_csv(parts_str),
                _escape_csv(services_str),
            ])
        filename = "relatorio_ordens.csv"

    elif report_type == "stock":
        writer.writerow(["ID", "Nome", "Codigo", "Quantidade", "Estoque Minimo", "Preco Compra", "Preco Venda"])
        parts = (
            db.query(Part)
            .filter(Part.oficina_id == user.oficina_id)
            .order_by(Part.nome)
            .all()
        )
        for p in parts:
            writer.writerow([
                p.id,
                _escape_csv(p.nome),
                _escape_csv(p.codigo) if p.codigo else "",
                p.quantidade,
                p.estoque_minimo,
                f"{p.preco_compra:.2f}" if p.preco_compra else "0.00",
                f"{p.preco_venda:.2f}" if p.preco_venda else "0.00",
            ])
        filename = "relatorio_estoque.csv"

    elif report_type == "clients":
        writer.writerow(["ID", "Nome", "Telefone", "Email", "Total Ordens", "Total Gasto", "Ultima Visita"])
        start, end = _parse_date_range(start_date, end_date)
        clients_data = (
            db.query(
                Cliente.id,
                Cliente.nome,
                Cliente.telefone,
                Cliente.email,
                func.count(ServiceOrder.id).label("total_orders"),
                func.sum(ServiceOrder.valor_total).label("total_spent"),
                func.max(ServiceOrder.created_at).label("last_visit"),
            )
            .outerjoin(ServiceOrder, ServiceOrder.cliente_id == Cliente.id)
            .filter(Cliente.oficina_id == user.oficina_id)
            .filter(ServiceOrder.created_at >= start if start else True)
            .filter(ServiceOrder.created_at <= end if end else True)
            .group_by(Cliente.id)
            .order_by(func.count(ServiceOrder.id).desc())
            .all()
        )
        for r in clients_data:
            writer.writerow([
                r.id,
                _escape_csv(r.nome),
                _escape_csv(r.telefone) if r.telefone else "",
                _escape_csv(r.email) if r.email else "",
                r.total_orders,
                f"{float(r.total_spent or 0):.2f}",
                r.last_visit.strftime("%Y-%m-%d %H:%M") if r.last_visit else "",
            ])
        filename = "relatorio_clientes.csv"

    elif report_type == "profitability":
        writer.writerow(["Peca", "Codigo", "Qtd Vendida", "Receita", "Custo", "Lucro", "Margem"])
        start, end = _parse_date_range(start_date, end_date)
        query = (
            db.query(
                Part.nome,
                Part.codigo,
                func.sum(OrderPart.quantidade).label("qty_sold"),
                func.sum(OrderPart.quantidade * OrderPart.preco_unitario).label("total_revenue"),
                func.sum(OrderPart.quantidade * Part.preco_compra).label("total_cost"),
            )
            .join(OrderPart, OrderPart.part_id == Part.id)
            .join(ServiceOrder, ServiceOrder.id == OrderPart.order_id)
            .filter(Part.oficina_id == user.oficina_id)
        )
        if start:
            query = query.filter(ServiceOrder.created_at >= start)
        if end:
            query = query.filter(ServiceOrder.created_at <= end)
        query = query.group_by(Part.id)
        for r in query.all():
            revenue = float(r.total_revenue or 0)
            cost = float(r.total_cost or 0)
            profit = revenue - cost
            margin = (profit / revenue * 100) if revenue > 0 else 0.0
            writer.writerow([
                _escape_csv(r.nome),
                _escape_csv(r.codigo) if r.codigo else "",
                int(r.qty_sold or 0),
                f"{revenue:.2f}",
                f"{cost:.2f}",
                f"{profit:.2f}",
                f"{margin:.1f}%",
            ])
        filename = "relatorio_lucratividade.csv"

    elif report_type == "stock_evolution":
        writer.writerow(["Data", "Peca", "Qtd", "Tipo", "Referencia"])
        start, end = _parse_date_range(start_date, end_date)
        query = (
            db.query(
                ServiceOrder.created_at.label("date"),
                Part.nome.label("part_nome"),
                OrderPart.quantidade.label("quantidade"),
                ServiceOrder.id.label("order_id"),
            )
            .join(OrderPart, OrderPart.order_id == ServiceOrder.id)
            .join(Part, Part.id == OrderPart.part_id)
            .filter(Part.oficina_id == user.oficina_id)
        )
        if start:
            query = query.filter(ServiceOrder.created_at >= start)
        if end:
            query = query.filter(ServiceOrder.created_at <= end)
        for r in query.order_by(ServiceOrder.created_at.desc()).all():
            writer.writerow([
                r.date.strftime("%Y-%m-%d %H:%M") if r.date else "",
                _escape_csv(r.part_nome),
                -abs(r.quantidade),
                "saida",
                f"OS #{r.order_id}",
            ])
        filename = "relatorio_evolucao_estoque.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/pdf/{report_type}")
def export_report_pdf(
    report_type: str,
    start_date: str = Query(None),
    end_date: str = Query(None),
    client_id: int = Query(None),
    vehicle_id: int = Query(None),
    status: str = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if report_type not in ("financial", "orders", "stock", "clients", "profitability"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid report type. Use: financial, orders, stock, clients, profitability")

    ofid = user.oficina_id
    start, end = _parse_date_range(start_date, end_date)
    period_str = f"Periodo: {start_date or 'Inicio'} a {end_date or 'Atual'}"

    if report_type == "financial":
        base = db.query(Transaction).filter(Transaction.oficina_id == ofid)
        base = _apply_date_filter(base, Transaction.created_at, start, end)

        total_income = (
            base.filter(Transaction.tipo == "entrada")
            .with_entities(func.sum(Transaction.valor))
            .scalar() or 0
        )
        total_expenses = (
            base.filter(Transaction.tipo == "saida")
            .with_entities(func.sum(Transaction.valor))
            .scalar() or 0
        )
        balance = float(total_income) - float(total_expenses)

        daily = (
            db.query(
                func.strftime("%Y-%m-%d", Transaction.created_at).label("date"),
                func.sum(Transaction.valor).filter(Transaction.tipo == "entrada").label("income"),
                func.sum(Transaction.valor).filter(Transaction.tipo == "saida").label("expense"),
            )
            .filter(Transaction.oficina_id == ofid)
            .filter(Transaction.created_at >= start if start else True)
            .filter(Transaction.created_at <= end if end else True)
            .group_by(func.strftime("%Y-%m-%d", Transaction.created_at))
            .order_by(func.strftime("%Y-%m-%d", Transaction.created_at))
            .all()
        )

        lines = [
            period_str,
            "",
            f"Receitas Totais: R$ {float(total_income):.2f}",
            f"Despesas Totais: R$ {float(total_expenses):.2f}",
            f"Saldo: R$ {balance:.2f}",
            "",
            "--- Movimentacao Diaria ---",
        ]
        for d in daily:
            lines.append(f"{d.date}: Entrada R$ {float(d.income or 0):.2f} | Saida R$ {float(d.expense or 0):.2f}")

        title = "Relatorio Financeiro"
        filename = "relatorio_financeiro.pdf"

    elif report_type == "orders":
        orders_q = (
            db.query(ServiceOrder)
            .filter(ServiceOrder.oficina_id == ofid)
            .options(
                selectinload(ServiceOrder.parts_used).selectinload(OrderPart.part),
                selectinload(ServiceOrder.services_used).selectinload(OrderService.service),
            )
        )
        orders_q = _apply_date_filter(orders_q, ServiceOrder.created_at, start, end)
        if client_id:
            orders_q = orders_q.filter(ServiceOrder.cliente_id == client_id)
        if vehicle_id:
            orders_q = orders_q.filter(ServiceOrder.vehicle_id == vehicle_id)
        if status:
            orders_q = orders_q.filter(ServiceOrder.status == status)

        orders = orders_q.order_by(ServiceOrder.created_at.desc()).all()

        lines = [
            period_str,
            f"Total de Ordens: {len(orders)}",
            "",
            "--- Ordens de Servico ---",
        ]
        for o in orders:
            cliente = o.cliente.nome if o.cliente else "N/A"
            valor = float(o.valor_total or 0)
            data = o.created_at.strftime("%d/%m/%Y") if o.created_at else "N/A"
            lines.append(f"OS #{o.id} | {cliente} | {o.status} | R$ {valor:.2f} | {data}")

        title = "Relatorio de Ordens"
        filename = "relatorio_ordens.pdf"

    elif report_type == "stock":
        parts = (
            db.query(Part)
            .filter(Part.oficina_id == ofid)
            .order_by(Part.nome)
            .all()
        )

        lines = [
            f"Total de Pecas: {len(parts)}",
            "",
            "--- Estoque ---",
        ]
        for p in parts:
            compra = float(p.preco_compra or 0)
            venda = float(p.preco_venda or 0)
            minimo = p.estoque_minimo or 0
            alerta = " [BAIXO]" if p.quantidade < minimo else ""
            lines.append(
                f"{p.nome} | Qty: {p.quantidade} | Min: {minimo} | "
                f"Compra: R$ {compra:.2f} | Venda: R$ {venda:.2f}{alerta}"
            )

        title = "Relatorio de Estoque"
        filename = "relatorio_estoque.pdf"

    elif report_type == "clients":
        clients_data = (
            db.query(
                Cliente.id,
                Cliente.nome,
                Cliente.telefone,
                func.count(ServiceOrder.id).label("total_orders"),
                func.sum(ServiceOrder.valor_total).label("total_spent"),
                func.max(ServiceOrder.created_at).label("last_visit"),
            )
            .outerjoin(ServiceOrder, ServiceOrder.cliente_id == Cliente.id)
            .filter(Cliente.oficina_id == ofid)
            .filter(ServiceOrder.created_at >= start if start else True)
            .filter(ServiceOrder.created_at <= end if end else True)
            .group_by(Cliente.id)
            .order_by(func.count(ServiceOrder.id).desc())
            .all()
        )

        lines = [
            period_str,
            f"Total de Clientes: {len(clients_data)}",
            "",
            "--- Clientes ---",
        ]
        for r in clients_data:
            total = float(r.total_spent or 0)
            ultima = r.last_visit.strftime("%d/%m/%Y") if r.last_visit else "N/A"
            lines.append(
                f"{r.nome} | Tel: {r.telefone or 'N/A'} | "
                f"Ordens: {r.total_orders} | Total: R$ {total:.2f} | Ultima: {ultima}"
            )

        title = "Relatorio de Clientes"
        filename = "relatorio_clientes.pdf"

    elif report_type == "profitability":
        query = (
            db.query(
                Part.id,
                Part.nome,
                Part.codigo,
                func.sum(OrderPart.quantidade).label("qty_sold"),
                func.sum(OrderPart.quantidade * OrderPart.preco_unitario).label("total_revenue"),
                func.sum(OrderPart.quantidade * Part.preco_compra).label("total_cost"),
            )
            .join(OrderPart, OrderPart.part_id == Part.id)
            .join(ServiceOrder, ServiceOrder.id == OrderPart.order_id)
            .filter(Part.oficina_id == ofid)
        )
        if start:
            query = query.filter(ServiceOrder.created_at >= start)
        if end:
            query = query.filter(ServiceOrder.created_at <= end)
        query = query.group_by(Part.id)
        rows = query.all()

        parts_data = []
        total_revenue = 0.0
        total_cost = 0.0
        for r in rows:
            revenue = float(r.total_revenue or 0)
            cost = float(r.total_cost or 0)
            profit = revenue - cost
            margin = (profit / revenue * 100) if revenue > 0 else 0.0
            total_revenue += revenue
            total_cost += cost
            parts_data.append({
                "nome": r.nome,
                "qty_sold": int(r.qty_sold or 0),
                "revenue": revenue,
                "cost": cost,
                "profit": profit,
                "margin": margin,
            })
        parts_data.sort(key=lambda x: x["profit"], reverse=True)

        total_profit = total_revenue - total_cost
        avg_margin = (total_profit / total_revenue * 100) if total_revenue > 0 else 0.0

        lines = [
            period_str,
            f"Receita Total: R$ {total_revenue:.2f}",
            f"Custo Total: R$ {total_cost:.2f}",
            f"Lucro Total: R$ {total_profit:.2f}",
            f"Margem Media: {avg_margin:.1f}%",
            "",
            "--- Lucratividade por Peca ---",
        ]
        for p in parts_data:
            lines.append(
                f"{p['nome']} | Vendidos: {p['qty_sold']} | "
                f"Receita: R$ {p['revenue']:.2f} | Lucro: R$ {p['profit']:.2f} | "
                f"Margem: {p['margin']:.1f}%"
            )

        title = "Relatorio de Lucratividade"
        filename = "relatorio_lucratividade.pdf"

    pdf_bytes = _simple_pdf(title, lines)

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
