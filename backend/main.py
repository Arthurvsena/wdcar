from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from database import engine, Base
from models import run_migrations
from routers import auth, clients, parts, services, orders, finance, dashboard, mecanico, cash_register, suppliers, garantia, reports
from slowapi.errors import RateLimitExceeded

run_migrations()
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WDOcar - Gestão de Oficina Mecânica")
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
app.include_router(finance.router)
app.include_router(dashboard.router)
app.include_router(mecanico.router)
app.include_router(cash_register.router)
app.include_router(suppliers.router)
app.include_router(garantia.router)
app.include_router(reports.router)


os.makedirs("uploads/avatars", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads", html=False), name="uploads")


@app.get("/")
def root():
    return {"message": "WDOcar API - Gestão de Oficina Mecânica"}
