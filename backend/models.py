from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Enum as SAEnum, Date, text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from database import Base, engine


class Role(str, enum.Enum):
    MASTER = "master"
    ADMIN = "admin"
    USER = "user"
    DEV = "dev"
    MECANICO = "mecanico"


class OSStatus(str, enum.Enum):
    ABERTA = "aberta"
    EM_ANDAMENTO = "em_andamento"
    AGUARDANDO_PECA = "aguardando_peca"
    AGUARDANDO_PAGAMENTO = "aguardando_pagamento"
    AGUARDANDO_APROVACAO = "aguardando_aprovacao_orcamento"
    ORCAMENTO_RECUSADO = "orcamento_recusado"
    FINALIZADA = "finalizada"
    CANCELADA = "cancelada"


class OrcamentoStatus(str, enum.Enum):
    PENDENTE = "pendente"
    APROVADO = "aprovado"
    REPROVADO = "reprovado"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String,  nullable=False)
    oficina_id = Column(Integer, index=True, nullable=False)
    nome_oficina = Column(String, default="Minha Oficina")
    email = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    permissoes = Column(String, nullable=True)
    is_master = Column(Boolean, default=False, nullable=False)
    role = Column(String(20), default="user", nullable=False)
    is_dev = Column(Boolean, default=False, nullable=False)
    telefone_oficina = Column(String, nullable=True)


class Cliente(Base):
    __tablename__ = "clientes"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    nome = Column(String, nullable=False)
    cpf_cnpj = Column(String, nullable=True)
    telefone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    bairro = Column(String, nullable=True)
    cidade = Column(String, nullable=True)
    estado = Column(String, nullable=True)
    cep = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    vehicles = relationship("Vehicle", back_populates="cliente", cascade="all, delete-orphan")


class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    placa = Column(String, nullable=True)
    modelo = Column(String, nullable=False)
    marca = Column(String, nullable=False)
    ano = Column(Integer, nullable=True)
    cor = Column(String, nullable=True)

    cliente = relationship("Cliente", back_populates="vehicles")


class Part(Base):
    __tablename__ = "parts"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    nome = Column(String, nullable=False)
    codigo = Column(String, nullable=True)
    preco_compra = Column(Float, default=0.0)
    preco_venda = Column(Float, default=0.0)
    quantidade = Column(Integer, default=0)
    estoque_minimo = Column(Integer, default=0)


class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    nome = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    valor_mao_obra = Column(Float, default=0.0)


class ServiceOrder(Base):
    __tablename__ = "service_orders"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    status = Column(String, default=OSStatus.ABERTA.value, index=True)
    orcamento_status = Column(String, default=OrcamentoStatus.PENDENTE.value)
    orcamento_token = Column(String,  nullable=True, unique=True)
    observacoes = Column(String, nullable=True)
    prioridade = Column(Integer, default=0)
    aguardando_peca = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    valor_total = Column(Float, default=0.0)
    nota = Column(String, nullable=True)
    garantia_meses = Column(Integer, nullable=True)
    garantia_fim = Column(DateTime, nullable=True)

    cliente = relationship("Cliente")
    vehicle = relationship("Vehicle")

    status_history = relationship("StatusHistory", back_populates="order", cascade="all, delete-orphan", order_by="StatusHistory.created_at")

    parts_used = relationship("OrderPart", back_populates="order", cascade="all, delete-orphan")
    services_used = relationship("OrderService", back_populates="order", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    tipo = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    valor = Column(Float, default=0.0)
    referencia_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    cash_register_id = Column(Integer, ForeignKey("cash_register.id"), nullable=True)

    # Relationships
    cash_register = relationship("CashRegister", back_populates="transactions")


class OrderPart(Base):
    __tablename__ = "order_parts"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("service_orders.id"), nullable=False)
    part_id = Column(Integer, ForeignKey("parts.id"), nullable=False)
    quantidade = Column(Integer, default=1)
    preco_unitario = Column(Float, default=0.0)

    order = relationship("ServiceOrder", back_populates="parts_used")
    part = relationship("Part")


class OrderService(Base):
    __tablename__ = "order_services"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("service_orders.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    valor_cobrado = Column(Float, default=0.0)

    order = relationship("ServiceOrder", back_populates="services_used")
    service = relationship("Service")


class StatusHistory(Base):
    __tablename__ = "status_history"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("service_orders.id"), nullable=False, index=True)
    status = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
    order = relationship("ServiceOrder", back_populates="status_history")


class CashRegister(Base):
    __tablename__ = "cash_register"
    id = Column(Integer, primary_key=True, index=True)
    office_id = Column(Integer, index=True, nullable=False)
    date = Column(Date, nullable=False)  # Date only (YYYY-MM-DD)
    opening_balance = Column(Float, default=0.0)
    total_incomes = Column(Float, default=0.0)
    total_expenses = Column(Float, default=0.0)
    closing_balance = Column(Float, default=0.0)
    is_open = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    transactions = relationship("Transaction", back_populates="cash_register")


class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    nome = Column(String, nullable=False)
    cnpj_cpf = Column(String, nullable=True)
    ie_rg = Column(String, nullable=True)
    telefone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    bairro = Column(String, nullable=True)
    cidade = Column(String, nullable=True)
    estado = Column(String, nullable=True)
    cep = Column(String, nullable=True)
    contato_nome = Column(String, nullable=True)
    observacoes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    data_pedido = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="pendente")
    valor_total = Column(Float, default=0.0)
    observacoes = Column(String, nullable=True)

    supplier = relationship("Supplier")
    items = relationship("PurchaseItem", back_populates="purchase_order", cascade="all, delete-orphan")


class PurchaseItem(Base):
    __tablename__ = "purchase_items"
    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    part_id = Column(Integer, ForeignKey("parts.id"), nullable=False)
    quantidade = Column(Integer, default=1)
    preco_unitario = Column(Float, default=0.0)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    part = relationship("Part")


# Add relationship to Transaction model
Transaction.cash_register = relationship("CashRegister", back_populates="transactions")


def run_migrations():
    with engine.connect() as conn:
        conn.execute(text("PRAGMA foreign_keys=OFF"))
        conn.execute(text("PRAGMA legacy_alter_table=ON"))
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_master BOOLEAN DEFAULT 0 NOT NULL"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' NOT NULL"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_dev BOOLEAN DEFAULT 0 NOT NULL"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN telefone_oficina VARCHAR"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE parts ADD COLUMN estoque_minimo INTEGER DEFAULT 0"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN nota VARCHAR"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN garantia_meses INTEGER"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN garantia_fim DATETIME"))
        except Exception:
            pass
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS status_history (
                    id INTEGER PRIMARY KEY,
                    order_id INTEGER NOT NULL,
                    status VARCHAR NOT NULL,
                    user_id INTEGER,
                    created_at DATETIME
                )
            """))
        except Exception:
            pass
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS cash_register (
                    id INTEGER PRIMARY KEY,
                    office_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    opening_balance REAL DEFAULT 0.0,
                    total_incomes REAL DEFAULT 0.0,
                    total_expenses REAL DEFAULT 0.0,
                    closing_balance REAL DEFAULT 0.0,
                    is_open BOOLEAN DEFAULT 0,
                    created_at DATETIME,
                    updated_at DATETIME
                )
            """))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN cash_register_id INTEGER"))
        except Exception:
            pass
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_transactions_cash_register ON transactions(cash_register_id)"))
        except Exception:
            pass
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS suppliers (
                    id INTEGER PRIMARY KEY,
                    oficina_id INTEGER NOT NULL,
                    nome VARCHAR NOT NULL,
                    cnpj_cpf VARCHAR,
                    ie_rg VARCHAR,
                    telefone VARCHAR,
                    email VARCHAR,
                    endereco VARCHAR,
                    bairro VARCHAR,
                    cidade VARCHAR,
                    estado VARCHAR,
                    cep VARCHAR,
                    contato_nome VARCHAR,
                    observacoes VARCHAR,
                    created_at DATETIME
                )
            """))
        except Exception:
            pass
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS purchase_orders (
                    id INTEGER PRIMARY KEY,
                    oficina_id INTEGER NOT NULL,
                    supplier_id INTEGER NOT NULL,
                    data_pedido DATETIME,
                    status VARCHAR DEFAULT 'pendente',
                    valor_total REAL DEFAULT 0.0,
                    observacoes VARCHAR,
                    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
                )
            """))
        except Exception:
            pass
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS purchase_items (
                    id INTEGER PRIMARY KEY,
                    purchase_order_id INTEGER NOT NULL,
                    part_id INTEGER NOT NULL,
                    quantidade INTEGER DEFAULT 1,
                    preco_unitario REAL DEFAULT 0.0,
                    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
                    FOREIGN KEY (part_id) REFERENCES parts(id)
                )
            """))
        except Exception:
            pass
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_suppliers_oficina ON suppliers(oficina_id)"))
        except Exception:
            pass
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_purchase_orders_oficina ON purchase_orders(oficina_id)"))
        except Exception:
            pass
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id)"))
        except Exception:
            pass
        conn.commit()
