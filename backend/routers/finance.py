from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, Transaction
from schemas import TransactionOut
from auth import get_current_user

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/transactions", response_model=list[TransactionOut])
def list_transactions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Transaction)
        .filter(Transaction.oficina_id == user.oficina_id)
        .order_by(Transaction.created_at.desc())
        .all()
    )


@router.get("/summary")
def finance_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ofid = user.oficina_id
    entries = (
        db.query(Transaction)
        .filter(Transaction.oficina_id == ofid, Transaction.tipo == "entrada")
        .all()
    )
    exits = (
        db.query(Transaction)
        .filter(Transaction.oficina_id == ofid, Transaction.tipo == "saida")
        .all()
    )
    total_in = sum(t.valor for t in entries)
    total_out = sum(t.valor for t in exits)
    return {
        "total_entradas": total_in,
        "total_saidas": total_out,
        "saldo": total_in - total_out,
        "quantidade_entradas": len(entries),
        "quantidade_saidas": len(exits),
    }
