import sqlite3, os
os.chdir(os.path.dirname(__file__) or ".")
con = sqlite3.connect("wdocar.db")
cur = con.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("Tabelas:", cur.fetchall())
try:
    cur.execute("SELECT id, username, length(hashed_password), is_master, role, is_dev, oficina_id FROM users")
    rows = cur.fetchall()
    print(f"Users ({len(rows)}):")
    for r in rows:
        print(" ", r)
except Exception as e:
    print("Erro users:", e)
try:
    cur.execute("PRAGMA table_info(users)")
    cols = cur.fetchall()
    print("Colunas users:")
    for c in cols:
        print(" ", c)
except Exception as e:
    print("Erro schema:", e)
