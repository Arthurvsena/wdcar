"""Fluxo completo de OS: cliente → veículo → OS → peça (estoque) → aprovação pública → finalização."""
from conftest import auth_headers


def test_fluxo_completo_os(client, master_token):
    H = auth_headers(master_token)

    r = client.post("/clients", json={"nome": "Cliente Fluxo", "telefone": "11911112222"}, headers=H)
    assert r.status_code == 200, r.text
    cliente = r.json()

    r = client.post(f"/clients/{cliente['id']}/vehicles", json={"modelo": "Uno", "marca": "Fiat", "placa": "FLU1234"}, headers=H)
    assert r.status_code == 200, r.text
    veiculo = r.json()

    # peça com estoque no limite: usar 1 dispara alerta de estoque baixo
    r = client.post("/parts", json={"nome": "Correia teste", "preco_venda": 80.0, "quantidade": 3, "estoque_minimo": 3}, headers=H)
    assert r.status_code == 200, r.text
    peca = r.json()

    r = client.post("/orders", json={"cliente_id": cliente["id"], "vehicle_id": veiculo["id"]}, headers=H)
    assert r.status_code == 200, r.text
    os_criada = r.json()
    assert os_criada["orcamento_token"]

    # adiciona peça: estoque 3 -> 2 (abaixo do mínimo)
    r = client.post(f"/orders/{os_criada['id']}/parts", json={"part_id": peca["id"], "quantidade": 1}, headers=H)
    assert r.status_code == 200, r.text
    assert r.json()["remaining_stock"] == 2

    r = client.get(f"/parts/{peca['id']}", headers=H)
    assert r.json()["quantidade"] == 2

    # notificação de estoque baixo foi criada
    r = client.get("/notifications", headers=H)
    tipos = [n["tipo"] for n in r.json()["items"]]
    assert "estoque_baixo" in tipos

    # cliente aprova o orçamento pelo link público (sem auth)
    r = client.get(f"/orders/public/{os_criada['orcamento_token']}")
    assert r.status_code == 200
    r = client.post(f"/orders/public/{os_criada['orcamento_token']}/approve")
    assert r.status_code == 200
    assert r.json()["status"] == "aprovado"

    r = client.get(f"/orders/{os_criada['id']}", headers=H)
    assert r.json()["status"] == "em_andamento"

    r = client.get("/notifications", headers=H)
    tipos = [n["tipo"] for n in r.json()["items"]]
    assert "orcamento_aprovado" in tipos

    # finalizar lança receita no financeiro
    r = client.post(f"/orders/{os_criada['id']}/status?status=finalizada", headers=H)
    assert r.status_code == 200

    r = client.get("/finance/transactions", headers=H)
    assert r.status_code == 200
    body = r.json()
    transacoes = body["items"] if isinstance(body, dict) else body
    descricoes = [t.get("descricao", "") for t in transacoes]
    assert any(f"OS #{os_criada['id']}" in d for d in descricoes), descricoes


def test_estoque_insuficiente_bloqueia(client, master_token):
    H = auth_headers(master_token)
    r = client.post("/clients", json={"nome": "Cliente Estoque", "telefone": "11933334444"}, headers=H)
    cliente = r.json()
    r = client.post(f"/clients/{cliente['id']}/vehicles", json={"modelo": "Gol", "marca": "VW", "placa": "EST5678"}, headers=H)
    veiculo = r.json()
    r = client.post("/parts", json={"nome": "Vela teste", "preco_venda": 20.0, "quantidade": 1, "estoque_minimo": 0}, headers=H)
    peca = r.json()
    r = client.post("/orders", json={"cliente_id": cliente["id"], "vehicle_id": veiculo["id"]}, headers=H)
    os_criada = r.json()

    r = client.post(f"/orders/{os_criada['id']}/parts", json={"part_id": peca["id"], "quantidade": 5}, headers=H)
    assert r.status_code == 400
