"""Fixtures da suíte de testes.

ORDEM CRÍTICA: main.py roda migrations/create_all/seed no import usando o
sqlite relativo ./wdocar.db — por isso trocamos o cwd para um diretório
temporário ANTES de importar main, para que os testes nunca toquem o banco real.
"""
import os
import sys
import tempfile

os.environ["DISABLE_SCHEDULER"] = "1"
_backup_tmp = tempfile.mkdtemp(prefix="girocerto_backups_")
os.environ["BACKUP_DIR"] = _backup_tmp

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

_tmpdir = tempfile.mkdtemp(prefix="girocerto_tests_")
os.chdir(_tmpdir)

import pytest
from fastapi.testclient import TestClient

import main  # noqa: E402  (cria o wdocar.db do tmpdir)

main.app.state.limiter.enabled = False


MASTER = {"username": "master_teste", "password": "Senha123!", "nome_oficina": "Oficina Teste"}
MECANICO = {"username": "mecanico_teste", "password": "Senha123!"}
DEV = {"username": "dev_teste", "password": "Senha123!"}


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def client():
    return TestClient(main.app)


@pytest.fixture(scope="session")
def master_token(client):
    r = client.post("/auth/register", json=MASTER)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def mecanico_token(client, master_token):
    r = client.post(
        "/auth/users",
        json={"username": MECANICO["username"], "password": MECANICO["password"], "role": "mecanico"},
        headers=auth_headers(master_token),
    )
    assert r.status_code == 200, r.text
    r = client.post("/auth/login", json=MECANICO)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def dev_token(client, master_token):
    from database import SessionLocal
    from models import User, Oficina
    from auth import hash_password

    db = SessionLocal()
    oficina = db.query(Oficina).first()
    db.add(User(
        username=DEV["username"],
        hashed_password=hash_password(DEV["password"]),
        oficina_id=oficina.id,
        nome_oficina="GiroCerto",
        is_dev=True,
        role="dev",
    ))
    db.commit()
    db.close()
    r = client.post("/auth/login", json=DEV)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]
