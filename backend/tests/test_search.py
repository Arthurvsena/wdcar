from conftest import auth_headers


def test_busca_global(client, master_token):
    H = auth_headers(master_token)
    # dados dos testes anteriores: "Cliente Fluxo" com Gol/Uno etc.
    client.post("/clients", json={"nome": "Buscavel Silva", "telefone": "11900001111"}, headers=H)

    r = client.get("/search?q=Buscavel", headers=H)
    assert r.status_code == 200
    body = r.json()
    assert any(c["nome"] == "Buscavel Silva" for c in body["clientes"])

    # menos de 2 caracteres retorna grupos vazios
    r = client.get("/search?q=B", headers=H)
    assert r.json() == {"clientes": [], "veiculos": [], "ordens": [], "pecas": []}

    # busca por número acha a OS
    r = client.get("/search?q=%231", headers=H)
    assert r.status_code == 200


def test_busca_respeita_permissoes(client, mecanico_token):
    # mecânico não tem módulo "clientes" nem "pecas": grupos vêm vazios, sem erro
    r = client.get("/search?q=Buscavel", headers=auth_headers(mecanico_token))
    assert r.status_code == 200
    body = r.json()
    assert body["clientes"] == []
    assert body["pecas"] == []


def test_busca_bloqueia_dev(client, dev_token):
    r = client.get("/search?q=teste", headers=auth_headers(dev_token))
    assert r.status_code == 403
