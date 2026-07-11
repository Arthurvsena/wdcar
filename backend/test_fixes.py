import requests, subprocess, sys, time, os

os.environ["JWT_SECRET_KEY"] = "dev-secret-key-change-in-production"

proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
)
time.sleep(3)

BASE = "http://localhost:8000"
ok = True

try:
    r = requests.post(f"{BASE}/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Login OK")

    r = requests.get(f"{BASE}/parts/low-stock", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and "total" in data
    print(f"[PASS] Low-stock endpoint: {data['total']} items")

    r = requests.get(f"{BASE}/dashboard/health", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert all(k in data for k in ("financeiro", "oficina", "estoque"))
    print(f"[PASS] Health endpoint: financeiro={data['financeiro']['score']}, oficina={data['oficina']['score']}, estoque={data['estoque']['score']}")

    r = requests.get(f"{BASE}/finance/summary", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "total_entradas" in data
    print(f"[PASS] Finance summary: entradas={data['total_entradas']}, saidas={data['total_saidas']}")

    r = requests.get(f"{BASE}/finance/transactions/export", headers=headers)
    assert r.status_code == 200
    assert "text/csv" in r.headers.get("content-type", "")
    print("[PASS] CSV export OK")

    print("\n=== Rate limit test ===")
    for i in range(12):
        r = requests.post(f"{BASE}/auth/login", json={"username": "admin", "password": "admin123"})
        print(f"  Request {i+1}: {r.status_code}", end="")
        if r.status_code == 429:
            print(" (RATE LIMITED)")
            break
        else:
            print()

    assert r.status_code == 429, f"Rate limit not triggered: {r.status_code}"
    print("[PASS] Rate limiting OK")

except Exception as e:
    print(f"[FAIL] {e}")
    ok = False
finally:
    proc.terminate()
    proc.wait()

sys.exit(0 if ok else 1)
