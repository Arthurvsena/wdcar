from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from database import get_db
from models import User, CashRegister, Transaction
from auth import get_current_user
from schemas import TransactionCreate, TransactionOut
from permissions import require_cash
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/cash", tags=["cash"], dependencies=[Depends(require_cash)])


class CashRegisterCreate(BaseModel):
    opening_balance: float


class CashRegisterResponse(BaseModel):
    id: int
    date: date
    opening_balance: float
    total_incomes: float
    total_expenses: float
    closing_balance: float
    is_open: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CashRegisterSummary(BaseModel):
    id: int
    date: date
    opening_balance: float
    total_incomes: float
    total_expenses: float
    closing_balance: float
    is_open: bool

    class Config:
        from_attributes = True


@router.post("/open", response_model=CashRegisterResponse)
def open_cash_register(payload: CashRegisterCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    
    # Check if cash register already exists for today
    existing = db.query(CashRegister).filter(
        CashRegister.office_id == user.oficina_id,
        CashRegister.date == today
    ).first()
    
    if existing:
        if existing.is_open:
            raise HTTPException(status_code=400, detail="Cash register is already open for today")
        else:
            # Reopen existing closed cash register
            existing.opening_balance = payload.opening_balance
            existing.total_incomes = 0.0
            existing.total_expenses = 0.0
            existing.closing_balance = 0.0
            existing.is_open = True
            db.commit()
            db.refresh(existing)
            return existing
    
    # Create new cash register for today
    cash_register = CashRegister(
        office_id=user.oficina_id,
        date=today,
        opening_balance=payload.opening_balance,
        is_open=True
    )
    db.add(cash_register)
    db.commit()
    db.refresh(cash_register)
    return cash_register


@router.post("/close", response_model=CashRegisterResponse)
def close_cash_register(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    
    cash_register = db.query(CashRegister).filter(
        CashRegister.office_id == user.oficina_id,
        CashRegister.date == today,
        CashRegister.is_open == True
    ).first()
    
    if not cash_register:
        raise HTTPException(status_code=404, detail="No open cash register found for today")
    
    # Calculate totals from transactions
    totals = db.query(
        func.coalesce(func.sum(Transaction.valor).filter(Transaction.tipo == 'entrada'), 0).label('total_in'),
        func.coalesce(func.sum(Transaction.valor).filter(Transaction.tipo == 'saida'), 0).label('total_out')
    ).filter(
        Transaction.office_id == user.oficina_id,
        Transaction.cash_register_id == cash_register.id
    ).first()
    
    cash_register.total_incomes = float(totals.total_in or 0)
    cash_register.total_expenses = float(totals.total_out or 0)
    cash_register.closing_balance = cash_register.opening_balance + cash_register.total_incomes - cash_register.total_expenses
    cash_register.is_open = False
    
    db.commit()
    db.refresh(cash_register)
    return cash_register


@router.get("/today", response_model=CashRegisterResponse)
def get_today_cash_register(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    
    cash_register = db.query(CashRegister).filter(
        CashRegister.office_id == user.oficina_id,
        CashRegister.date == today
    ).first()
    
    if not cash_register:
        # Return a default structure for today (not opened yet)
        return CashRegisterResponse(
            id=0,
            date=today,
            opening_balance=0.0,
            total_incomes=0.0,
            total_expenses=0.0,
            closing_balance=0.0,
            is_open=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
    
    return cash_register


@router.get("/history", response_model=List[CashRegisterSummary])
def get_cash_register_history(skip: int = 0, limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cash_registers = db.query(CashRegister).filter(
        CashRegister.office_id == user.oficina_id
    ).order_by(CashRegister.date.desc()).offset(skip).limit(limit).all()
    
    return cash_registers


@router.post("/transaction", response_model=TransactionOut)
def add_transaction_to_cash(payload: TransactionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.tipo not in ("entrada", "saida"):
        raise HTTPException(status_code=400, detail="tipo must be 'entrada' or 'saida'")
    if payload.valor <= 0:
        raise HTTPException(status_code=400, detail="valor must be positive")
    
    today = date.today()
    
    # Get or create open cash register for today
    cash_register = db.query(CashRegister).filter(
        CashRegister.office_id == user.oficina_id,
        CashRegister.date == today,
        CashRegister.is_open == True
    ).first()
    
    if not cash_register:
        raise HTTPException(status_code=400, detail="No open cash register for today. Please open the cash register first.")
    
    # Create transaction linked to cash register
    transaction_data = payload.model_dump()
    transaction_data['oficina_id'] = user.oficina_id
    transaction_data['cash_register_id'] = cash_register.id
    
    transaction = Transaction(**transaction_data)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    return transaction