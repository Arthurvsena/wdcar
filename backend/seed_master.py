from database import SessionLocal, engine
from models import User

def seed_master():
    with SessionLocal() as db:
        user = db.query(User).filter(User.username == "admin").first()
        if user:
            user.is_master = True
            user.role = "master"
            db.commit()
            print(f"[OK] User '{user.username}' is now is_master=True, role=master")
        else:
            print("[X] User 'admin' not found - trying first user...")
            first_user = db.query(User).first()
            if first_user:
                first_user.is_master = True
                first_user.role = "master"
                db.commit()
                print(f"[OK] User '{first_user.username}' is now is_master=True, role=master")

if __name__ == "__main__":
    seed_master()