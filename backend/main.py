from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from routers import auth, clients, parts, services, orders, finance, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(title="WDOcar - Gestão de Oficina Mecânica")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
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


import os
os.makedirs("uploads/avatars", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def root():
    return {"message": "WDOcar API - Gestão de Oficina Mecânica"}
