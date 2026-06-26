from database import SessionLocal, engine, Base
from models import User, Cliente, Vehicle, Part, Service, ServiceOrder, OrderPart, OrderService
from auth import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(User).count() == 0:
    user = User(
        username="admin",
        hashed_password=hash_password("admin123"),
        oficina_id=1,
        nome_oficina="Oficina do João",
    )
    db.add(user)

    cli1 = Cliente(oficina_id=1, nome="Carlos Silva", cpf_cnpj="123.456.789-00", telefone="11999999999", email="carlos@email.com")
    cli2 = Cliente(oficina_id=1, nome="Maria Souza", cpf_cnpj="987.654.321-00", telefone="11988888888", email="maria@email.com")
    db.add_all([cli1, cli2])
    db.flush()

    veh1 = Vehicle(oficina_id=1, cliente_id=cli1.id, placa="ABC-1234", modelo="Civic", marca="Honda", ano=2020, cor="Preto")
    veh2 = Vehicle(oficina_id=1, cliente_id=cli1.id, placa="DEF-5678", modelo="Corolla", marca="Toyota", ano=2022, cor="Branco")
    veh3 = Vehicle(oficina_id=1, cliente_id=cli2.id, placa="GHI-9012", modelo="Onix", marca="Chevrolet", ano=2021, cor="Prata")
    db.add_all([veh1, veh2, veh3])
    db.flush()

    p1 = Part(oficina_id=1, nome="Óleo Motor 5W30", codigo="OLEO-001", preco_compra=25.0, preco_venda=45.0, quantidade=50)
    p2 = Part(oficina_id=1, nome="Filtro de Óleo", codigo="FIL-001", preco_compra=12.0, preco_venda=25.0, quantidade=30)
    p3 = Part(oficina_id=1, nome="Pastilha de Freio", codigo="FREIO-001", preco_compra=35.0, preco_venda=65.0, quantidade=20)
    p4 = Part(oficina_id=1, nome="Bateria 60Ah", codigo="BAT-001", preco_compra=180.0, preco_venda=280.0, quantidade=10)
    db.add_all([p1, p2, p3, p4])
    db.flush()

    s1 = Service(oficina_id=1, nome="Troca de Óleo", descricao="Troca completa de óleo do motor", valor_mao_obra=50.0)
    s2 = Service(oficina_id=1, nome="Alinhamento", descricao="Alinhamento da direção", valor_mao_obra=80.0)
    s3 = Service(oficina_id=1, nome="Balanceamento", descricao="Balanceamento das rodas", valor_mao_obra=60.0)
    s4 = Service(oficina_id=1, nome="Revisão Completa", descricao="Revisão geral do veículo", valor_mao_obra=200.0)
    db.add_all([s1, s2, s3, s4])
    db.flush()

    order = ServiceOrder(oficina_id=1, cliente_id=cli1.id, vehicle_id=veh1.id, status="finalizada", valor_total=120.0, orcamento_token="demo-token-123")
    db.add(order)
    db.flush()

    op = OrderPart(order_id=order.id, part_id=p1.id, quantidade=1, preco_unitario=p1.preco_venda)
    osv = OrderService(order_id=order.id, service_id=s1.id, valor_cobrado=s1.valor_mao_obra)
    db.add_all([op, osv])
    db.flush()

    p1.quantidade -= 1

    db.commit()
    print("Seed data created successfully!")
else:
    print("Database already has data.")

db.close()
