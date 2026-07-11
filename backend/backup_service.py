"""Backup do banco SQLite via API nativa (segura mesmo com conexões abertas).

Fonte: ./wdocar.db relativo ao cwd (mesma convenção do engine em database.py —
o uvicorn roda a partir de backend/). Destino: data/backups/ ao lado deste
arquivo, com rotação dos N mais recentes.
"""
import os
import sqlite3
from datetime import datetime, timezone

DB_PATH = os.path.abspath("wdocar.db")
BACKUP_DIR = os.getenv(
    "BACKUP_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "backups"),
)
MAX_BACKUPS = int(os.getenv("MAX_BACKUPS", "14"))


def create_backup() -> dict:
    if not os.path.isfile(DB_PATH):
        raise FileNotFoundError(f"Banco não encontrado em {DB_PATH}")
    os.makedirs(BACKUP_DIR, exist_ok=True)
    filename = f"wdocar_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    dest_path = os.path.join(BACKUP_DIR, filename)

    src = sqlite3.connect(DB_PATH)
    dst = sqlite3.connect(dest_path)
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()

    _rotate()
    return {
        "file": filename,
        "size": os.path.getsize(dest_path),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def list_backups() -> list:
    if not os.path.isdir(BACKUP_DIR):
        return []
    backups = []
    for name in sorted(os.listdir(BACKUP_DIR), reverse=True):
        if name.startswith("wdocar_") and name.endswith(".db"):
            path = os.path.join(BACKUP_DIR, name)
            backups.append({
                "file": name,
                "size": os.path.getsize(path),
                "created_at": datetime.fromtimestamp(os.path.getmtime(path), tz=timezone.utc).isoformat(),
            })
    return backups


def _rotate():
    backups = sorted(
        (n for n in os.listdir(BACKUP_DIR) if n.startswith("wdocar_") and n.endswith(".db")),
        reverse=True,
    )
    for old in backups[MAX_BACKUPS:]:
        try:
            os.remove(os.path.join(BACKUP_DIR, old))
        except OSError:
            pass
