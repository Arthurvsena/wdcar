import sys
sys.path.insert(0, '.')
from main import app
from routers.finance import _stream_transactions
from database import SessionLocal
from models import Transaction
import csv, io

db = SessionLocal()
ofid = 1

try:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Tipo', 'Descricao', 'Valor', 'Data'])
    for t in _stream_transactions(ofid, db):
        escaped = t.descricao
        if escaped and escaped.startswith(('=', '+', '-', '@')):
            escaped = "'" + escaped
        writer.writerow([
            t.id,
            t.tipo,
            escaped,
            f'{t.valor:.2f}',
            t.created_at.strftime('%Y-%m-%d %H:%M') if t.created_at else ''
        ])
    csv_content = output.getvalue()
    print(f'CSV content length: {len(csv_content)}')
    print('CSV content:')
    print(csv_content)

except Exception as e:
    print('Error:', e)
    import traceback
    traceback.print_exc()
finally:
    db.close()
