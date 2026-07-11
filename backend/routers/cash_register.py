from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from database import get_db
from models import User, CashSession, CashMovement
from schemas import CashOpenRequest, CashCloseRequest, CashMovementCreate, CashMovementOut, CashSessionOut
from auth import get_current_user
from permissions import require_permission
from audit import audit

router = APIRouter(prefix="/cash", tags=["cash"], dependencies=[Depends(require_permission("caixa"))])


def _get_open_session(user: User, db: Session) -> CashSession:
    session = (
        db.query(CashSession)
        .filter(CashSession.oficina_id == user.oficina_id, CashSession.status == "aberto")
        .first()
    )
    if not session:
        raise HTTPException(status_code=400, detail="No open cash session")
    return session


@router.post("/open", response_model=CashSessionOut)
def open_cash(payload: CashOpenRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = (
        db.query(CashSession)
        .filter(CashSession.oficina_id == user.oficina_id, CashSession.status == "aberto")
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Cash session already open")
    session = CashSession(
        oficina_id=user.oficina_id,
        opened_by_id=user.id,
        valor_abertura=payload.valor_abertura,
    )
    db.add(session)
    db.flush()
    audit(db, user, "caixa_aberto", "cash_session", session.id, detalhe=f"R$ {payload.valor_abertura:.2f}")
    db.commit()
    db.refresh(session)
    return session


@router.get("/current", response_model=CashSessionOut)
def current_cash(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = (
        db.query(CashSession)
        .options(selectinload(CashSession.movements))
        .filter(CashSession.oficina_id == user.oficina_id, CashSession.status == "aberto")
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="No open cash session")
    return session


@router.post("/movements", response_model=CashMovementOut)
def add_movement(payload: CashMovementCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = _get_open_session(user, db)
    movement = CashMovement(
        cash_session_id=session.id,
        tipo=payload.tipo,
        descricao=payload.descricao,
        valor=payload.valor,
    )
    db.add(movement)
    db.flush()
    audit(db, user, "caixa_movimento", "cash_movement", movement.id, detalhe=f"{payload.tipo} R$ {payload.valor:.2f} - {payload.descricao or ''}")
    db.commit()
    db.refresh(movement)
    return movement


@router.post("/close", response_model=CashSessionOut)
def close_cash(payload: CashCloseRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from datetime import datetime, timezone

    session = _get_open_session(user, db)
    total_in = sum(m.valor for m in session.movements if m.tipo == "entrada")
    total_out = sum(m.valor for m in session.movements if m.tipo == "saida")
    calculado = session.valor_abertura + total_in - total_out
    session.valor_fechamento = payload.valor_fechamento if payload.valor_fechamento is not None else calculado
    session.status = "fechado"
    session.closed_at = datetime.now(timezone.utc)
    audit(db, user, "caixa_fechado", "cash_session", session.id, detalhe=f"R$ {session.valor_fechamento:.2f}")
    db.commit()
    db.refresh(session)
    return session


@router.get("/history")
def cash_history(skip: int = 0, limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = (
        db.query(CashSession)
        .filter(CashSession.oficina_id == user.oficina_id, CashSession.status == "fechado")
        .order_by(CashSession.closed_at.desc())
    )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}
