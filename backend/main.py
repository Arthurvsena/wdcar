from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from database import engine, Base, ensure_schema
from models import run_migrations, seed_oficinas
from routers import auth, clients, parts, services, orders, finance, dashboard
from routers import cash_register, suppliers, garantia, reports, notifications
from routers import oficina, dev, search
from slowapi.errors import RateLimitExceeded

ensure_schema()  # cria o schema dedicado (giro_app) no Postgres antes das tabelas
run_migrations()
Base.metadata.create_all(bind=engine)
seed_oficinas()

app = FastAPI(title="GiroCerto - Gestão de Oficinas")
app.state.limiter = auth.limiter


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Too many requests. Try again later."})

import os
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(parts.router)
app.include_router(services.router)
app.include_router(orders.router)
app.include_router(orders.public_router)
app.include_router(finance.router)
app.include_router(dashboard.router)
app.include_router(cash_register.router)
app.include_router(suppliers.router)
app.include_router(garantia.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(oficina.router)
app.include_router(dev.router)
app.include_router(search.router)


os.makedirs("uploads/avatars", exist_ok=True)
os.makedirs("uploads/logos", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads", html=False), name="uploads")


@app.on_event("startup")
def _start_scheduler():
    if os.getenv("DISABLE_SCHEDULER") == "1":
        return
    from scheduler import start_scheduler
    start_scheduler()


APP_VERSION = "1.0.0"


@app.get("/health")
def health():
    from datetime import datetime, timezone
    from sqlalchemy import text as sa_text
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(sa_text("SELECT 1"))
    except Exception:
        db_status = "error"
    body = {
        "status": "ok" if db_status == "ok" else "degraded",
        "db": db_status,
        "version": APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if db_status != "ok":
        return JSONResponse(status_code=503, content=body)
    return body


@app.get("/")
def root():
    return {"message": "GiroCerto API - Gestão de Oficinas"}
