from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Cliente, Vehicle
from schemas import ClienteCreate, ClienteOut, ClienteWithVehicles, VehicleCreate, VehicleOut
from auth import get_current_user
from validators import is_valid_cpf_cnpj, is_valid_email

router = APIRouter(prefix="/clients", tags=["clients"])


def _get_oficina(user: User) -> int:
    return user.oficina_id


def _check_cliente_duplicates(db: Session, ofid: int, payload: ClienteCreate, exclude_id: int = None):
    if payload.cpf_cnpj:
        q = db.query(Cliente).filter(Cliente.oficina_id == ofid, Cliente.cpf_cnpj == payload.cpf_cnpj)
        if exclude_id:
            q = q.filter(Cliente.id != exclude_id)
        if q.first():
            raise HTTPException(status_code=422, detail="CPF/CNPJ já cadastrado")
    if payload.email:
        q = db.query(Cliente).filter(Cliente.oficina_id == ofid, Cliente.email == payload.email)
        if exclude_id:
            q = q.filter(Cliente.id != exclude_id)
        if q.first():
            raise HTTPException(status_code=422, detail="Email já cadastrado")
    if payload.telefone:
        q = db.query(Cliente).filter(Cliente.oficina_id == ofid, Cliente.telefone == payload.telefone)
        if exclude_id:
            q = q.filter(Cliente.id != exclude_id)
        if q.first():
            raise HTTPException(status_code=422, detail="Telefone já cadastrado")


def _check_vehicle_plate_duplicates(db: Session, ofid: int, placa: str, exclude_id: int = None):
    if not placa:
        return
    q = db.query(Vehicle).filter(Vehicle.oficina_id == ofid, Vehicle.placa == placa)
    if exclude_id:
        q = q.filter(Vehicle.id != exclude_id)
    if q.first():
        raise HTTPException(status_code=422, detail="Placa já cadastrada")


@router.get("", response_model=list[ClienteWithVehicles])
def list_clients(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ofid = _get_oficina(user)
    return db.query(Cliente).filter(Cliente.oficina_id == ofid).all()


@router.post("", response_model=ClienteOut)
def create_client(payload: ClienteCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.cpf_cnpj and not is_valid_cpf_cnpj(payload.cpf_cnpj):
        raise HTTPException(status_code=422, detail="CPF ou CNPJ inválido")
    if payload.email and not is_valid_email(payload.email):
        raise HTTPException(status_code=422, detail="Email inválido")
    _check_cliente_duplicates(db, user.oficina_id, payload)
    cli = Cliente(oficina_id=user.oficina_id, **payload.model_dump())
    db.add(cli)
    db.commit()
    db.refresh(cli)
    return cli


@router.get("/{cliente_id}", response_model=ClienteWithVehicles)
def get_client(cliente_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cli = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.oficina_id == user.oficina_id).first()
    if not cli:
        raise HTTPException(status_code=404, detail="Cliente not found")
    return cli


@router.put("/{cliente_id}", response_model=ClienteOut)
def update_client(cliente_id: int, payload: ClienteCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.cpf_cnpj and not is_valid_cpf_cnpj(payload.cpf_cnpj):
        raise HTTPException(status_code=422, detail="CPF ou CNPJ inválido")
    if payload.email and not is_valid_email(payload.email):
        raise HTTPException(status_code=422, detail="Email inválido")
    cli = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.oficina_id == user.oficina_id).first()
    if not cli:
        raise HTTPException(status_code=404, detail="Cliente not found")
    _check_cliente_duplicates(db, user.oficina_id, payload, exclude_id=cliente_id)
    for k, v in payload.model_dump().items():
        setattr(cli, k, v)
    db.commit()
    db.refresh(cli)
    return cli


@router.delete("/{cliente_id}")
def delete_client(cliente_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cli = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.oficina_id == user.oficina_id).first()
    if not cli:
        raise HTTPException(status_code=404, detail="Cliente not found")
    db.delete(cli)
    db.commit()
    return {"ok": True}


@router.post("/{cliente_id}/vehicles", response_model=VehicleOut)
def add_vehicle(cliente_id: int, payload: VehicleCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cli = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.oficina_id == user.oficina_id).first()
    if not cli:
        raise HTTPException(status_code=404, detail="Cliente not found")
    _check_vehicle_plate_duplicates(db, user.oficina_id, payload.placa)
    veh = Vehicle(oficina_id=user.oficina_id, cliente_id=cliente_id, **payload.model_dump())
    db.add(veh)
    db.commit()
    db.refresh(veh)
    return veh


@router.put("/{cliente_id}/vehicles/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(cliente_id: int, vehicle_id: int, payload: VehicleCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    veh = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.cliente_id == cliente_id, Vehicle.oficina_id == user.oficina_id).first()
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    _check_vehicle_plate_duplicates(db, user.oficina_id, payload.placa, exclude_id=vehicle_id)
    for k, v in payload.model_dump().items():
        setattr(veh, k, v)
    db.commit()
    db.refresh(veh)
    return veh


@router.delete("/{cliente_id}/vehicles/{vehicle_id}")
def remove_vehicle(cliente_id: int, vehicle_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    veh = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.cliente_id == cliente_id, Vehicle.oficina_id == user.oficina_id).first()
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    db.delete(veh)
    db.commit()
    return {"ok": True}
