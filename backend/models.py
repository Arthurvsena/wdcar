from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Enum as SAEnum, text
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


class Oficina(Base):
    __tablename__ = "oficinas"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    logo = Column(String, nullable=True)
    ativa = Column(Boolean, default=True, nullable=False)
    setup_completo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
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
    orcamento_token = Column(String, nullable=True, unique=True)
    observacoes = Column(String, nullable=True)
    prioridade = Column(Integer, default=0)
    aguardando_peca = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    valor_total = Column(Float, default=0.0)

    cliente = relationship("Cliente")
    vehicle = relationship("Vehicle")

    parts_used = relationship("OrderPart", back_populates="order", cascade="all, delete-orphan")
    services_used = relationship("OrderService", back_populates="order", cascade="all, delete-orphan")


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


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    tipo = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    valor = Column(Float, default=0.0)
    referencia_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    nome = Column(String, nullable=False)
    cnpj_cpf = Column(String, nullable=True)
    telefone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Purchase(Base):
    __tablename__ = "purchases"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    part_id = Column(Integer, ForeignKey("parts.id"), nullable=True)
    descricao = Column(String, nullable=True)
    quantidade = Column(Integer, default=1)
    valor_unitario = Column(Float, default=0.0)
    valor_total = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    supplier = relationship("Supplier")
    part = relationship("Part")


class CashSession(Base):
    __tablename__ = "cash_sessions"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    opened_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    valor_abertura = Column(Float, default=0.0)
    valor_fechamento = Column(Float, nullable=True)
    status = Column(String, default="aberto")
    opened_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    closed_at = Column(DateTime, nullable=True)

    movements = relationship("CashMovement", back_populates="session", cascade="all, delete-orphan")


class CashMovement(Base):
    __tablename__ = "cash_movements"
    id = Column(Integer, primary_key=True, index=True)
    cash_session_id = Column(Integer, ForeignKey("cash_sessions.id"), nullable=False)
    tipo = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    valor = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("CashSession", back_populates="movements")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String, nullable=True)
    acao = Column(String, index=True, nullable=False)
    entidade = Column(String, nullable=True)
    entidade_id = Column(Integer, nullable=True)
    detalhe = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    tipo = Column(String, default="geral")
    titulo = Column(String, nullable=False)
    mensagem = Column(String, nullable=True)
    link = Column(String, nullable=True)
    lida = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    endpoint = Column(String, unique=True, nullable=False)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Warranty(Base):
    __tablename__ = "warranties"
    id = Column(Integer, primary_key=True, index=True)
    oficina_id = Column(Integer, index=True, nullable=False)
    service_order_id = Column(Integer, ForeignKey("service_orders.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    descricao = Column(String, nullable=True)
    prazo_dias = Column(Integer, default=90)
    data_inicio = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    data_expiracao = Column(DateTime, nullable=False)
    status = Column(String, default="ativa")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    service_order = relationship("ServiceOrder")
    vehicle = relationship("Vehicle")


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
        conn.commit()


def seed_oficinas():
    """Cria registros na tabela oficinas para oficinas pré-existentes (só tinham
    oficina_id nos users). Roda depois de Base.metadata.create_all."""
    from database import SessionLocal

    db = SessionLocal()
    try:
        rows = db.execute(text(
            "SELECT DISTINCT u.oficina_id FROM users u "
            "WHERE u.oficina_id NOT IN (SELECT id FROM oficinas)"
        )).fetchall()
        for (oficina_id,) in rows:
            nome_row = db.execute(text(
                "SELECT nome_oficina FROM users WHERE oficina_id = :oid "
                "ORDER BY is_master DESC, id ASC LIMIT 1"
            ), {"oid": oficina_id}).fetchone()
            nome = (nome_row[0] if nome_row and nome_row[0] else None) or f"Oficina {oficina_id}"
            # oficinas existentes já operam: marca setup como completo
            db.add(Oficina(id=oficina_id, nome=nome, ativa=True, setup_completo=True))
        db.commit()
    finally:
        db.close()
