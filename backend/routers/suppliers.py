from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Supplier, Purchase, Part
from schemas import SupplierCreate, SupplierOut, PurchaseCreate, PurchaseOut
from auth import get_current_user
from permissions import require_permission

router = APIRouter(tags=["suppliers"])

# router misto (/suppliers + /purchases): permissão declarada por endpoint
_fornecedores = [Depends(require_permission("fornecedores"))]
_compras = [Depends(require_permission("compras"))]


@router.get("/suppliers", dependencies=_fornecedores)
def list_suppliers(skip: int = 0, limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Supplier).filter(Supplier.oficina_id == user.oficina_id)
    total = query.count()
    items = query.order_by(Supplier.nome).offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.post("/suppliers", response_model=SupplierOut, dependencies=_fornecedores)
def create_supplier(payload: SupplierCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    supplier = Supplier(oficina_id=user.oficina_id, **payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.put("/suppliers/{supplier_id}", response_model=SupplierOut, dependencies=_fornecedores)
def update_supplier(supplier_id: int, payload: SupplierCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id, Supplier.oficina_id == user.oficina_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for k, v in payload.model_dump().items():
        setattr(supplier, k, v)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/suppliers/{supplier_id}", dependencies=_fornecedores)
def delete_supplier(supplier_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id, Supplier.oficina_id == user.oficina_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.delete(supplier)
    db.commit()
    return {"ok": True}


@router.get("/purchases", dependencies=_compras)
def list_purchases(skip: int = 0, limit: int = 50, supplier_id: int = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Purchase).filter(Purchase.oficina_id == user.oficina_id)
    if supplier_id:
        query = query.filter(Purchase.supplier_id == supplier_id)
    query = query.order_by(Purchase.created_at.desc())
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.post("/purchases", response_model=PurchaseOut, dependencies=_compras)
def create_purchase(payload: PurchaseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == payload.supplier_id, Supplier.oficina_id == user.oficina_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    part = None
    if payload.part_id:
        part = db.query(Part).filter(Part.id == payload.part_id, Part.oficina_id == user.oficina_id).first()
        if not part:
            raise HTTPException(status_code=404, detail="Part not found")
    valor_total = payload.quantidade * payload.valor_unitario
    purchase = Purchase(
        oficina_id=user.oficina_id,
        supplier_id=payload.supplier_id,
        part_id=payload.part_id,
        descricao=payload.descricao,
        quantidade=payload.quantidade,
        valor_unitario=payload.valor_unitario,
        valor_total=valor_total,
    )
    db.add(purchase)
    if part:
        part.quantidade += payload.quantidade
    db.commit()
    db.refresh(purchase)
    return purchase
