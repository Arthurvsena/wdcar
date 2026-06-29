from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, Transaction
from schemas import TransactionCreate, TransactionOut
from auth import get_current_user

router = APIRouter(prefix="/finance", tags=["finance"])


@router.post("/transactions", response_model=TransactionOut)
def create_transaction(payload: TransactionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.tipo not in ("entrada", "saida"):
        raise HTTPException(status_code=400, detail="tipo must be 'entrada' or 'saida'")
    if payload.valor <= 0:
        raise HTTPException(status_code=400, detail="valor must be positive")
    t = Transaction(oficina_id=user.oficina_id, **payload.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.get("/transactions")
def list_transactions(skip: int = 0, limit: int = 50, data_inicio: str = None, data_fim: str = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Transaction)

    if data_inicio:
        try:
            dt_inicio = datetime.strptime(data_inicio, "%Y-%m-%d")
            query = query.filter(Transaction.created_at >= dt_inicio)
        except ValueError:
            pass
    if data_fim:
        try:
            dt_fim = datetime.strptime(data_fim, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(Transaction.created_at <= dt_fim)
        except ValueError:
            pass

    query = (
        query
        .filter(Transaction.oficina_id == user.oficina_id)
        .order_by(Transaction.created_at.desc())
    )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/summary")
def finance_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ofid = user.oficina_id
    total_in = db.query(func.sum(Transaction.valor)).filter(
        Transaction.oficina_id == ofid, Transaction.tipo == "entrada"
    ).scalar() or 0
    total_out = db.query(func.sum(Transaction.valor)).filter(
        Transaction.oficina_id == ofid, Transaction.tipo == "saida"
    ).scalar() or 0
    qtd_in = db.query(func.count(Transaction.id)).filter(
        Transaction.oficina_id == ofid, Transaction.tipo == "entrada"
    ).scalar() or 0
    qtd_out = db.query(func.count(Transaction.id)).filter(
        Transaction.oficina_id == ofid, Transaction.tipo == "saida"
    ).scalar() or 0
    return {
        "total_entradas": total_in,
        "total_saidas": total_out,
        "saldo": total_in - total_out,
        "quantidade_entradas": qtd_in,
        "quantidade_saidas": qtd_out,
    }


def _escape_csv(val):
    if isinstance(val, str) and val.startswith(('=', '+', '-', '@')):
        return "'" + val
    return val

@router.get("/transactions/export")
def export_transactions_csv(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    import csv, io
    transactions = db.query(Transaction).filter(
        Transaction.oficina_id == user.oficina_id
    ).order_by(Transaction.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Tipo", "Descricao", "Valor", "Data"])
    for t in transactions:
        writer.writerow([
            t.id,
            t.tipo,
            _escape_csv(t.descricao) if t.descricao else None,
            f"{t.valor:.2f}",
            t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else ""
        ])
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transacoes.csv"}
    )
