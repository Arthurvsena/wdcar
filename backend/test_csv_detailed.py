import requests, subprocess, sys, time, os

os.environ["JWT_SECRET_KEY"] = "dev-secret-key-change-in-production"

proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
    stdout=subprocess.PIPE, stderr=subprocess.PIPE
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

    r = requests.get(f"{BASE}/finance/transactions/export", headers=headers)
    print(f"DEBUG CSV: status={r.status_code}, content-type={r.headers.get('content-type')}, body_len={len(r.text)}")
    print(f"Body: {r.text[:200]}")
    
    if r.status_code == 500:
        # Try to get more details from stderr
        out, err = proc.communicate(timeout=2)
        print(f"stderr: {err.decode()[-2000:]}")
    
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert "text/csv" in r.headers.get("content-type", ""), f"Expected text/csv, got {r.headers.get('content-type')}"
    print("[PASS] CSV export OK")

except Exception as e:
    print(f"[FAIL] {e}")
    import traceback
    traceback.print_exc()
    ok = False
finally:
    proc.terminate()
    proc.wait()

sys.exit(0 if ok else 1)
