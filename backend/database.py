import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, event, text, MetaData
from sqlalchemy.orm import sessionmaker, declarative_base

# carrega .env cedo: database é importado antes dos routers, então precisamos
# do load aqui para que DATABASE_URL/DB_SCHEMA do .env valham no dev local
load_dotenv()

# DATABASE_URL define o banco: por padrão SQLite local (dev). Em produção,
# aponte para o Postgres/Neon (ex.: postgresql://user:pass@host/neondb?sslmode=require).
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./wdocar.db")

# Cada projeto vive em seu próprio schema Postgres dentro do mesmo banco Neon,
# espelhando o padrão do ArtMoney (finance_app). Só se aplica a Postgres.
DB_SCHEMA = os.getenv("DB_SCHEMA", "giro_app")

IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # normaliza o prefixo legado postgres:// -> postgresql://
    url = DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    # pool_pre_ping evita conexões mortas (Neon fecha conexões ociosas);
    # pool_recycle mantém o pool saudável em ambientes serverless/gerenciados.
    engine = create_engine(url, pool_pre_ping=True, pool_recycle=300)

    @event.listens_for(engine, "connect")
    def _set_search_path(dbapi_conn, conn_record):
        # toda conexão opera dentro do schema dedicado do projeto
        cur = dbapi_conn.cursor()
        cur.execute(f'SET search_path TO "{DB_SCHEMA}"')
        cur.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

if IS_SQLITE:
    Base = declarative_base()
else:
    # No Postgres, os nomes de tabela são qualificados com o schema
    # (giro_app.users, ...). Isso é ESSENCIAL no pooler do Neon (PgBouncer em
    # transaction mode), onde um `SET search_path` por sessão NÃO persiste entre
    # transações — daí queries sem schema falharem com "relation ... does not exist".
    Base = declarative_base(metadata=MetaData(schema=DB_SCHEMA))


def ensure_schema():
    """Garante que o schema dedicado exista antes de criar as tabelas.
    No-op no SQLite (que não tem schemas)."""
    if IS_SQLITE:
        return
    with engine.connect() as conn:
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{DB_SCHEMA}"'))
        conn.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
