"""Enforcement de permissões por módulo no backend (a falha crítica da auditoria)."""
from conftest import auth_headers


def test_mecanico_bloqueado_no_financeiro(client, mecanico_token):
    r = client.get("/finance/transactions", headers=auth_headers(mecanico_token))
    assert r.status_code == 403
    r = client.get("/finance/summary", headers=auth_headers(mecanico_token))
    assert r.status_code == 403


def test_mecanico_bloqueado_no_caixa(client, mecanico_token):
    r = client.get("/cash/history", headers=auth_headers(mecanico_token))
    assert r.status_code == 403


def test_mecanico_bloqueado_em_pecas_e_clientes(client, mecanico_token):
    assert client.get("/parts", headers=auth_headers(mecanico_token)).status_code == 403
    assert client.get("/clients", headers=auth_headers(mecanico_token)).status_code == 403


def test_mecanico_acessa_os_e_garantia(client, mecanico_token):
    assert client.get("/orders", headers=auth_headers(mecanico_token)).status_code == 200
    assert client.get("/garantia", headers=auth_headers(mecanico_token)).status_code == 200
    assert client.get("/dashboard/metrics", headers=auth_headers(mecanico_token)).status_code == 200


def test_master_acessa_tudo(client, master_token):
    for path in ["/finance/transactions", "/cash/history", "/parts", "/clients", "/orders", "/suppliers", "/purchases"]:
        r = client.get(path, headers=auth_headers(master_token))
        assert r.status_code == 200, f"{path} -> {r.status_code}"


def test_dev_bloqueado_em_dados_da_oficina(client, dev_token):
    for path in ["/orders", "/finance/transactions", "/clients"]:
        r = client.get(path, headers=auth_headers(dev_token))
        assert r.status_code == 403, f"{path} -> {r.status_code}"


def test_sem_token_nao_passa(client):
    for path in ["/finance/transactions", "/orders", "/clients"]:
        r = client.get(path)
        assert r.status_code in (401, 403)


def test_rota_publica_de_orcamento_segue_aberta(client, master_token):
    # token inexistente -> 404 (e não 401/403): a rota é pública
    r = client.get("/orders/public/token-inexistente")
    assert r.status_code == 404
