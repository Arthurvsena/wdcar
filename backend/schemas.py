from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    password: str
    nome_oficina: str = "Minha Oficina"


class UserOut(BaseModel):
    id: int
    username: str
    oficina_id: int
    nome_oficina: str
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ClienteBase(BaseModel):
    nome: str
    cpf_cnpj: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None


class ClienteCreate(ClienteBase):
    pass


class ClienteOut(ClienteBase):
    id: int
    oficina_id: int
    created_at: datetime
    class Config:
        from_attributes = True


class VehicleBase(BaseModel):
    placa: Optional[str] = None
    modelo: str
    marca: str
    ano: Optional[int] = None
    cor: Optional[str] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleOut(VehicleBase):
    id: int
    oficina_id: int
    cliente_id: int
    class Config:
        from_attributes = True


class ClienteWithVehicles(ClienteOut):
    vehicles: list[VehicleOut] = []


class PartBase(BaseModel):
    nome: str
    codigo: Optional[str] = None
    preco_compra: float = 0.0
    preco_venda: float = 0.0
    quantidade: int = 0


class PartCreate(PartBase):
    pass


class PartOut(PartBase):
    id: int
    oficina_id: int
    class Config:
        from_attributes = True


class ServiceBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    valor_mao_obra: float = 0.0


class ServiceCreate(ServiceBase):
    pass


class ServiceOut(ServiceBase):
    id: int
    oficina_id: int
    class Config:
        from_attributes = True


class OrderPartCreate(BaseModel):
    part_id: int
    quantidade: int = 1


class OrderServiceCreate(BaseModel):
    service_id: int


class ServiceOrderCreate(BaseModel):
    cliente_id: int
    vehicle_id: int
    observacoes: Optional[str] = None


class ServiceOrderUpdate(BaseModel):
    status: Optional[str] = None
    aguardando_peca: Optional[bool] = None


class ServiceOrderOut(BaseModel):
    id: int
    oficina_id: int
    cliente_id: int
    vehicle_id: int
    status: str
    orcamento_status: str
    orcamento_token: Optional[str] = None
    observacoes: Optional[str] = None
    prioridade: int = 0
    aguardando_peca: bool = False
    created_at: datetime
    updated_at: datetime
    valor_total: float
    cliente: Optional[ClienteOut] = None
    vehicle: Optional[VehicleOut] = None
    parts_used: list = []
    services_used: list = []

    class Config:
        from_attributes = True


class TransactionCreate(BaseModel):
    tipo: str
    descricao: str
    valor: float
    referencia_id: Optional[int] = None


class TransactionOut(BaseModel):
    id: int
    oficina_id: int
    tipo: str
    descricao: Optional[str] = None
    valor: float
    referencia_id: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True


class DashboardMetrics(BaseModel):
    total_clientes: int
    total_os: int
    os_abertas: int
    os_finalizadas: int
    reincidentes: list[dict]
    marcas_mais_atendidas: list[dict]
    pecas_mais_usadas: list[dict]
    servicos_mais_usados: list[dict]
