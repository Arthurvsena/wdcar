from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Part
from schemas import PartCreate, PartOut
from auth import get_current_user

router = APIRouter(prefix="/parts", tags=["parts"])


@router.get("", response_model=list[PartOut])
def list_parts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Part).filter(Part.oficina_id == user.oficina_id).all()


@router.post("", response_model=PartOut)
def create_part(payload: PartCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    part = Part(oficina_id=user.oficina_id, **payload.model_dump())
    db.add(part)
    db.commit()
    db.refresh(part)
    return part


@router.put("/{part_id}", response_model=PartOut)
def update_part(part_id: int, payload: PartCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    part = db.query(Part).filter(Part.id == part_id, Part.oficina_id == user.oficina_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    for k, v in payload.model_dump().items():
        setattr(part, k, v)
    db.commit()
    db.refresh(part)
    return part


@router.delete("/{part_id}")
def delete_part(part_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    part = db.query(Part).filter(Part.id == part_id, Part.oficina_id == user.oficina_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    db.delete(part)
    db.commit()
    return {"ok": True}
