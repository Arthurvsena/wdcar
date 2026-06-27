from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from database import Base


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
    hashed_password = Column(String, nullable=False)
    oficina_id = Column(Integer, index=True, nullable=False)
    nome_oficina = Column(String, default="Minha Oficina")


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
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    status = Column(String, default=OSStatus.ABERTA.value)
    orcamento_status = Column(String, default=OrcamentoStatus.PENDENTE.value)
    orcamento_token = Column(String, nullable=True, unique=True)
    observacoes = Column(String, nullable=True)
    prioridade = Column(Integer, default=0)
    aguardando_peca = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
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
