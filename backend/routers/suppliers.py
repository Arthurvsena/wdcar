from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import User, Supplier, PurchaseOrder, PurchaseItem, Part
from schemas import (
    SupplierCreate, SupplierUpdate, SupplierOut,
    PurchaseOrderCreate, PurchaseOrderOut, PurchaseOrderDetail,
    PurchaseStatusUpdate,
)
from auth import get_current_user

router = APIRouter(tags=["suppliers & purchases"])


@router.get("/suppliers")
def list_suppliers(
    skip: int = 0,
    limit: int = 50,
    search: str = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Supplier).filter(Supplier.oficina_id == user.oficina_id)
    if search:
        query = query.filter(
            Supplier.nome.ilike(f"%{search}%") | Supplier.cnpj_cpf.ilike(f"%{search}%")
        )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.post("/suppliers", response_model=SupplierOut)
def create_supplier(
    payload: SupplierCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    supplier = Supplier(oficina_id=user.oficina_id, **payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/suppliers/{supplier_id}", response_model=SupplierOut)
def get_supplier(
    supplier_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id, Supplier.oficina_id == user.oficina_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.put("/suppliers/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id, Supplier.oficina_id == user.oficina_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, k, v)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/suppliers/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id, Supplier.oficina_id == user.oficina_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.delete(supplier)
    db.commit()
    return {"ok": True}


@router.get("/suppliers/{supplier_id}/purchases")
def supplier_purchases(
    supplier_id: int,
    skip: int = 0,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id, Supplier.oficina_id == user.oficina_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    query = db.query(PurchaseOrder).filter(
        PurchaseOrder.supplier_id == supplier_id,
        PurchaseOrder.oficina_id == user.oficina_id,
    )
    total = query.count()
    items = query.options(joinedload(PurchaseOrder.supplier)).offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.post("/purchases", response_model=PurchaseOrderDetail)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    supplier = db.query(Supplier).filter(
        Supplier.id == payload.supplier_id, Supplier.oficina_id == user.oficina_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    order = PurchaseOrder(
        oficina_id=user.oficina_id,
        supplier_id=payload.supplier_id,
        observacoes=payload.observacoes,
    )
    db.add(order)
    db.flush()

    total = 0.0
    for item_data in payload.items:
        part = db.query(Part).filter(
            Part.id == item_data.part_id, Part.oficina_id == user.oficina_id
        ).first()
        if not part:
            raise HTTPException(status_code=404, detail=f"Part {item_data.part_id} not found")
        item = PurchaseItem(
            purchase_order_id=order.id,
            part_id=item_data.part_id,
            quantidade=item_data.quantidade,
            preco_unitario=item_data.preco_unitario,
        )
        db.add(item)
        total += item_data.quantidade * item_data.preco_unitario

    order.valor_total = total
    db.commit()
    db.refresh(order)
    return _load_purchase_detail(order, db)


@router.get("/purchases")
def list_purchase_orders(
    skip: int = 0,
    limit: int = 50,
    status: str = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(PurchaseOrder).filter(PurchaseOrder.oficina_id == user.oficina_id)
    if status:
        query = query.filter(PurchaseOrder.status == status)
    total = query.count()
    items = query.options(joinedload(PurchaseOrder.supplier)).order_by(PurchaseOrder.id.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/purchases/{purchase_id}", response_model=PurchaseOrderDetail)
def get_purchase_order(
    purchase_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == purchase_id,
        PurchaseOrder.oficina_id == user.oficina_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return _load_purchase_detail(order, db)


@router.put("/purchases/{purchase_id}/status", response_model=PurchaseOrderDetail)
def update_purchase_status(
    purchase_id: int,
    payload: PurchaseStatusUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.status not in ("recebido", "cancelado"):
        raise HTTPException(status_code=400, detail="Status must be 'recebido' or 'cancelado'")

    order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == purchase_id,
        PurchaseOrder.oficina_id == user.oficina_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if order.status == "recebido":
        raise HTTPException(status_code=400, detail="Purchase order already received")
    if order.status == "cancelado":
        raise HTTPException(status_code=400, detail="Purchase order already cancelled")

    if payload.status == "recebido":
        items = db.query(PurchaseItem).filter(PurchaseItem.purchase_order_id == order.id).all()
        for item in items:
            part = db.query(Part).filter(Part.id == item.part_id).first()
            if part:
                part.quantidade = (part.quantidade or 0) + item.quantidade

    order.status = payload.status
    db.commit()
    db.refresh(order)
    return _load_purchase_detail(order, db)


def _load_purchase_detail(order: PurchaseOrder, db: Session) -> PurchaseOrderDetail:
    items = db.query(PurchaseItem).filter(
        PurchaseItem.purchase_order_id == order.id
    ).options(joinedload(PurchaseItem.part)).all()

    item_outs = []
    for item in items:
        part_dict = None
        if item.part:
            part_dict = {"id": item.part.id, "nome": item.part.nome, "codigo": item.part.codigo}
        item_outs.append({
            "id": item.id,
            "purchase_order_id": item.purchase_order_id,
            "part_id": item.part_id,
            "quantidade": item.quantidade,
            "preco_unitario": item.preco_unitario,
            "part": part_dict,
        })

    supplier_out = None
    if order.supplier:
        supplier_out = SupplierOut.model_validate(order.supplier).model_dump()

    return PurchaseOrderDetail(
        id=order.id,
        oficina_id=order.oficina_id,
        supplier_id=order.supplier_id,
        data_pedido=order.data_pedido,
        status=order.status,
        valor_total=order.valor_total,
        observacoes=order.observacoes,
        supplier=supplier_out,
        items=item_outs,
    )
