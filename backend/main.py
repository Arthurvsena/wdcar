from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, clients, parts, services, orders, finance, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(title="WDOcar - Gestão de Oficina Mecânica")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
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


@app.get("/")
def root():
    return {"message": "WDOcar API - Gestão de Oficina Mecânica"}
