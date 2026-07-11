import sys, io, traceback
sys.path.insert(0, '.')

from database import SessionLocal, engine
from models import Transaction

# Try to query and create CSV like the endpoint does
from routers.finance import _escape_csv
from datetime import datetime

db = SessionLocal()
try:
    # Check what transactions exist
    print("=== Database info ===")
    from sqlalchemy import text
    with engine.connect() as conn:
        result = conn.execute(text("SELECT count(*) FROM transactions"))
        print(f"Total transactions: {result.scalar()}")
        
        result = conn.execute(text("SELECT * FROM transactions"))
        for row in result:
            print(f"Row: {dict(row._mapping)}")
    
    print("\n=== Query using SQLAlchemy ===")
    transactions = db.query(Transaction).all()
    print(f"Number of transactions via SQLAlchemy: {len(transactions)}")
    for t in transactions:
        print(f"  id={t.id}, oficina_id={t.oficina_id}, tipo={t.tipo}, descricao={t.descricao}, valor={t.valor}, created_at={t.created_at}")
    
    print("\n=== Simulating the CSV export ===")
    from routers.finance import export_transactions_csv
    from unittest.mock import MagicMock
    
    # Create mock user
    mock_user = MagicMock()
    mock_user.oficina_id = 1
    
    # Call the endpoint function directly
    try:
        result = export_transactions_csv(mock_user, db)
        print(f"Result type: {type(result)}")
        print(f"Result: {result}")
        body = list(result.body_iterator)
        print(f"Body: {body}")
    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()

except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
finally:
    db.close()
