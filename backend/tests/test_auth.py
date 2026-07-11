from conftest import auth_headers, MASTER


def test_register_bootstrap_e_bloqueio(client, master_token):
    # master_token já registrou o 1º usuário; segundo cadastro público deve ser bloqueado
    r = client.post("/auth/register", json={"username": "intruso", "password": "Senha123!", "nome_oficina": "Fake"})
    assert r.status_code == 403


def test_login_ok(client, master_token):
    r = client.post("/auth/login", json={"username": MASTER["username"], "password": MASTER["password"]})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["user"]["username"] == MASTER["username"]


def test_login_senha_errada(client, master_token):
    r = client.post("/auth/login", json={"username": MASTER["username"], "password": "errada123"})
    assert r.status_code == 401


def test_me_exige_token(client):
    r = client.get("/auth/me")
    assert r.status_code in (401, 403)


def test_forgot_e_reset_password(client, master_token, monkeypatch):
    # cadastra email no perfil
    r = client.put("/auth/me", json={"email": "master@teste.com"}, headers=auth_headers(master_token))
    assert r.status_code == 200

    capturado = {}

    def fake_send(to, username, token):
        capturado["token"] = token
        return True

    monkeypatch.setattr("routers.auth.send_password_reset_email", fake_send)

    # resposta genérica idêntica para usuário existente e inexistente (anti-enumeração)
    r1 = client.post("/auth/forgot-password", json={"identificador": "master@teste.com"})
    r2 = client.post("/auth/forgot-password", json={"identificador": "nao_existe@x.com"})
    assert r1.status_code == r2.status_code == 200
    assert r1.json() == r2.json()
    assert "token" in capturado

    # token inválido é rejeitado
    r = client.post("/auth/reset-password", json={"token": "invalido", "new_password": "NovaSenha1!"})
    assert r.status_code == 400

    # reset com token real
    r = client.post("/auth/reset-password", json={"token": capturado["token"], "new_password": "NovaSenha1!"})
    assert r.status_code == 200

    # token é de uso único
    r = client.post("/auth/reset-password", json={"token": capturado["token"], "new_password": "Outra123!"})
    assert r.status_code == 400

    # login com a senha nova funciona; senha antiga não
    r = client.post("/auth/login", json={"username": MASTER["username"], "password": "NovaSenha1!"})
    assert r.status_code == 200
    r = client.post("/auth/login", json={"username": MASTER["username"], "password": MASTER["password"]})
    assert r.status_code == 401

    # restaura a senha original para não afetar os demais testes
    r = client.post("/auth/login", json={"username": MASTER["username"], "password": "NovaSenha1!"})
    tk = r.json()["access_token"]
    r = client.put(
        "/auth/me/password",
        json={"current_password": "NovaSenha1!", "new_password": MASTER["password"]},
        headers=auth_headers(tk),
    )
    assert r.status_code == 200
