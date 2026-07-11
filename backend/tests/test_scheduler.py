"""Verificações diárias: OS atrasada, garantia a vencer e dedupe."""
from datetime import datetime, timedelta, timezone

from conftest import auth_headers


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def test_daily_checks_gera_notificacoes_sem_duplicar(client, master_token):
    from database import SessionLocal
    from models import ServiceOrder, Warranty, Notification
    from scheduler import daily_checks

    H = auth_headers(master_token)

    # OS que ficará "atrasada" (retroage created_at 10 dias)
    r = client.post("/clients", json={"nome": "Cliente Sched", "telefone": "11977778888"}, headers=H)
    cliente = r.json()
    r = client.post(f"/clients/{cliente['id']}/vehicles", json={"modelo": "Ka", "marca": "Ford", "placa": "SCH1234"}, headers=H)
    veiculo = r.json()
    r = client.post("/orders", json={"cliente_id": cliente["id"], "vehicle_id": veiculo["id"]}, headers=H)
    os_id = r.json()["id"]

    db = SessionLocal()
    db.query(ServiceOrder).filter(ServiceOrder.id == os_id).update(
        {ServiceOrder.created_at: _now() - timedelta(days=10)}, synchronize_session=False
    )
    # garantia vencendo em 10 dias
    oficina_id = db.query(ServiceOrder).filter(ServiceOrder.id == os_id).first().oficina_id
    db.add(Warranty(
        oficina_id=oficina_id,
        service_order_id=os_id,
        vehicle_id=veiculo["id"],
        prazo_dias=90,
        data_inicio=_now() - timedelta(days=80),
        data_expiracao=_now() + timedelta(days=10),
        status="ativa",
    ))
    # limpa notificações anteriores para contagem limpa
    db.query(Notification).filter(Notification.oficina_id == oficina_id).delete(synchronize_session=False)
    db.commit()
    db.close()

    daily_checks()

    r = client.get("/notifications", headers=H)
    tipos = [n["tipo"] for n in r.json()["items"]]
    assert "os_atrasada" in tipos, tipos
    assert "garantia_vencendo" in tipos, tipos

    antes = len(r.json()["items"])

    # segunda execução não duplica (dedupe por tipo+link entre não-lidas)
    daily_checks()
    r = client.get("/notifications", headers=H)
    assert len(r.json()["items"]) == antes
