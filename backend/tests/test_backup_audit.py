import os

from conftest import auth_headers


def test_backup_manual_e_listagem(client, dev_token):
    r = client.post("/dev/backup", headers=auth_headers(dev_token))
    assert r.status_code == 200, r.text
    info = r.json()
    assert info["file"].startswith("wdocar_")
    assert info["size"] > 0
    assert os.path.isfile(os.path.join(os.environ["BACKUP_DIR"], info["file"]))

    r = client.get("/dev/backups", headers=auth_headers(dev_token))
    assert r.status_code == 200
    files = [b["file"] for b in r.json()["items"]]
    assert info["file"] in files


def test_backup_exige_dev(client, master_token):
    r = client.post("/dev/backup", headers=auth_headers(master_token))
    assert r.status_code == 403


def test_audit_registra_login(client, master_token, dev_token):
    # o master_token fixture fez login; deve haver registro de auditoria
    r = client.get("/dev/audit", headers=auth_headers(dev_token))
    assert r.status_code == 200
    acoes = [a["acao"] for a in r.json()["items"]]
    assert "login" in acoes


def test_audit_da_oficina_escopo_master(client, master_token):
    r = client.get("/oficina/audit", headers=auth_headers(master_token))
    assert r.status_code == 200
    body = r.json()
    assert "items" in body and "total" in body
    # criar um cliente gera registro
    r = client.post("/clients", json={"nome": "Cliente Audit", "telefone": "11955556666"}, headers=auth_headers(master_token))
    assert r.status_code == 200
    r = client.get("/oficina/audit", headers=auth_headers(master_token))
    acoes = [a["acao"] for a in r.json()["items"]]
    assert "cliente_criado" in acoes


def test_audit_exige_admin(client, mecanico_token):
    r = client.get("/oficina/audit", headers=auth_headers(mecanico_token))
    assert r.status_code == 403
