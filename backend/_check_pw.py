from database import SessionLocal, engine, Base
from models import User
from auth import hash_password, verify_password

with SessionLocal() as db:
    admin = db.query(User).filter(User.username == "admin").first()
    print("admin existe:", admin is not None)
    if admin is not None:
        print("hashed_password len:", len(admin.hashed_password))
        print("hash prefix:", admin.hashed_password[:7])
        valid = verify_password("admin123", admin.hashed_password)
        print("admin123 confere?:", valid)
        bad = verify_password("wrong", admin.hashed_password)
        print("senha errada rejeita?:", not bad)
