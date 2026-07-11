from pydantic import BaseModel, model_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class RoleEnum(str, Enum):
    MASTER = "master"
    ADMIN = "admin"
    USER = "user"
    DEV = "dev"
    MECANICO = "mecanico"


class UserCreate(BaseModel):
    username: str
    password: str
    nome_oficina: str = "Minha Oficina"


class UserOut(BaseModel):
    id: int
    username: str
    oficina_id: int
    nome_oficina: str
    email: Optional[str] = None
    avatar: Optional[str] = None
    permissoes: Optional[str] = None
    is_master: bool = False
    role: RoleEnum = RoleEnum.USER
    is_dev: bool = False
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    username: Optional[str] = None
    nome_oficina: Optional[str] = None
    email: Optional[str] = None
    role: Optional[RoleEnum] = None
    is_master: Optional[bool] = None
    is_dev: Optional[bool] = None


class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserCreateByAdmin(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    email: Optional[str] = None
    permissoes: Optional[str] = None
    role: Optional[RoleEnum] = None
    is_dev: Optional[bool] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ClienteBase(BaseModel):
    nome: str
    cpf_cnpj: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None


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
    estoque_minimo: int = 0


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

    @model_validator(mode="after")
    def validate_quantidade(self):
        if self.quantidade <= 0:
            raise ValueError("quantidade must be positive")
        return self


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


class SupplierBase(BaseModel):
    nome: str
    cnpj_cpf: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierOut(SupplierBase):
    id: int
    oficina_id: int
    created_at: datetime
    class Config:
        from_attributes = True


class PurchaseCreate(BaseModel):
    supplier_id: int
    part_id: Optional[int] = None
    descricao: Optional[str] = None
    quantidade: int = 1
    valor_unitario: float = 0.0

    @model_validator(mode="after")
    def validate_quantidade(self):
        if self.quantidade <= 0:
            raise ValueError("quantidade must be positive")
        if self.valor_unitario < 0:
            raise ValueError("valor_unitario must not be negative")
        return self


class PurchaseOut(BaseModel):
    id: int
    oficina_id: int
    supplier_id: int
    part_id: Optional[int] = None
    descricao: Optional[str] = None
    quantidade: int
    valor_unitario: float
    valor_total: float
    created_at: datetime
    class Config:
        from_attributes = True


class CashOpenRequest(BaseModel):
    valor_abertura: float = 0.0


class CashCloseRequest(BaseModel):
    valor_fechamento: Optional[float] = None


class CashMovementCreate(BaseModel):
    tipo: str
    descricao: Optional[str] = None
    valor: float

    @model_validator(mode="after")
    def validate_valor(self):
        if self.tipo not in ("entrada", "saida"):
            raise ValueError("tipo must be 'entrada' or 'saida'")
        if self.valor <= 0:
            raise ValueError("valor must be positive")
        return self


class CashMovementOut(BaseModel):
    id: int
    cash_session_id: int
    tipo: str
    descricao: Optional[str] = None
    valor: float
    created_at: datetime
    class Config:
        from_attributes = True


class CashSessionOut(BaseModel):
    id: int
    oficina_id: int
    opened_by_id: int
    valor_abertura: float
    valor_fechamento: Optional[float] = None
    status: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    movements: list[CashMovementOut] = []
    class Config:
        from_attributes = True


class WarrantyCreate(BaseModel):
    service_order_id: int
    vehicle_id: int
    descricao: Optional[str] = None
    prazo_dias: int = 90

    @model_validator(mode="after")
    def validate_prazo(self):
        if self.prazo_dias <= 0:
            raise ValueError("prazo_dias must be positive")
        return self


class WarrantyOut(BaseModel):
    id: int
    oficina_id: int
    service_order_id: int
    vehicle_id: int
    descricao: Optional[str] = None
    prazo_dias: int
    data_inicio: datetime
    data_expiracao: datetime
    status: str
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
