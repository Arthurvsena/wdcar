"""Jobs periódicos: verificações diárias por oficina + backup do banco.

Iniciado uma única vez pelo evento de startup do FastAPI (main.py).
Com uvicorn --reload não duplica: o startup só roda no processo servidor
e start_scheduler() é idempotente (guard scheduler.running).
"""
import logging
import os
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from database import SessionLocal
from models import Oficina, ServiceOrder, Warranty, Part, OSStatus
from notification_service import notify_oficina

logger = logging.getLogger("girocerto.scheduler")

OS_ATRASADA_DIAS = int(os.getenv("OS_ATRASADA_DIAS", "7"))
GARANTIA_AVISO_DIAS = 30

scheduler = BackgroundScheduler(timezone="America/Sao_Paulo")


def _now_utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _check_os_atrasadas(db, oficina_id: int, now: datetime):
    limite = now - timedelta(days=OS_ATRASADA_DIAS)
    atrasadas = (
        db.query(ServiceOrder)
        .filter(
            ServiceOrder.oficina_id == oficina_id,
            ServiceOrder.status.in_([OSStatus.ABERTA.value, OSStatus.EM_ANDAMENTO.value]),
            ServiceOrder.created_at < limite,
        )
        .all()
    )
    for os_ in atrasadas:
        dias = max(0, (now - os_.created_at).days) if os_.created_at else OS_ATRASADA_DIAS
        veiculo = f"{os_.vehicle.marca} {os_.vehicle.modelo}" if os_.vehicle else ""
        notify_oficina(
            db,
            oficina_id,
            tipo="os_atrasada",
            titulo="⏰ OS atrasada",
            mensagem=f"OS #{os_.id} ({veiculo}) está aberta há {dias} dias",
            link=f"/os/{os_.id}",
            dedupe=True,
        )


def _check_garantias(db, oficina_id: int, now: datetime):
    # expira as vencidas (mesma regra do refresh sob demanda em routers/garantia.py)
    db.query(Warranty).filter(
        Warranty.oficina_id == oficina_id,
        Warranty.status == "ativa",
        Warranty.data_expiracao < now,
    ).update({Warranty.status: "expirada"}, synchronize_session=False)

    janela = now + timedelta(days=GARANTIA_AVISO_DIAS)
    a_vencer = (
        db.query(Warranty)
        .filter(
            Warranty.oficina_id == oficina_id,
            Warranty.status == "ativa",
            Warranty.data_expiracao >= now,
            Warranty.data_expiracao <= janela,
        )
        .all()
    )
    for w in a_vencer:
        dias = max(0, (w.data_expiracao - now).days)
        veiculo = f"{w.vehicle.marca} {w.vehicle.modelo}" if w.vehicle else ""
        notify_oficina(
            db,
            oficina_id,
            tipo="garantia_vencendo",
            titulo="🛡️ Garantia a vencer",
            mensagem=f"Garantia da OS #{w.service_order_id} ({veiculo}) vence em {dias} dia{'s' if dias != 1 else ''}",
            link=f"/garantia?alerta={w.id}",
            dedupe=True,
        )


def _check_estoque_baixo(db, oficina_id: int):
    baixas = (
        db.query(Part)
        .filter(
            Part.oficina_id == oficina_id,
            Part.estoque_minimo > 0,
            Part.quantidade <= Part.estoque_minimo,
        )
        .all()
    )
    for part in baixas:
        # mesmo tipo/link dos hooks de orders.py/parts.py para o dedupe casar
        notify_oficina(
            db,
            oficina_id,
            tipo="estoque_baixo",
            titulo="⚠️ Estoque baixo",
            mensagem=f"{part.nome}: restam {part.quantidade} un. (mínimo: {part.estoque_minimo})",
            link=f"/pecas?alerta={part.id}",
            dedupe=True,
        )


def daily_checks():
    db = SessionLocal()
    try:
        now = _now_utc_naive()
        oficinas = db.query(Oficina).filter(Oficina.ativa == True).all()  # noqa: E712
        for oficina in oficinas:
            try:
                _check_os_atrasadas(db, oficina.id, now)
                _check_garantias(db, oficina.id, now)
                _check_estoque_baixo(db, oficina.id)
                db.commit()
            except Exception:
                db.rollback()
                logger.exception("daily_checks falhou para oficina %s", oficina.id)
    finally:
        db.close()


def backup_job():
    try:
        from backup_service import create_backup
        info = create_backup()
        logger.info("Backup diário criado: %s", info["file"])
    except Exception:
        logger.exception("Backup diário falhou")


def start_scheduler():
    if scheduler.running:
        return
    scheduler.add_job(daily_checks, "cron", hour=7, minute=0, id="daily_checks", replace_existing=True)
    scheduler.add_job(backup_job, "cron", hour=3, minute=0, id="daily_backup", replace_existing=True)
    # catch-up: roda as verificações logo após subir (servidor pode ficar desligado à noite)
    scheduler.add_job(daily_checks, "date", run_date=datetime.now() + timedelta(seconds=30), id="daily_checks_boot")
    scheduler.start()
    logger.info("Scheduler iniciado (daily_checks 07:00, backup 03:00)")
