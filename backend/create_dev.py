"""Cria (ou atualiza) o usuário desenvolvedor que acessa o painel /dev.

Uso:
    python create_dev.py <username> <senha>

No Docker:
    docker exec -it girocerto-backend python create_dev.py <username> <senha>
    (container atual: wdocar-backend)
"""
import sys

from database import SessionLocal
from models import User, Oficina
from auth import hash_password


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    username, password = sys.argv[1], sys.argv[2]
    if len(password) < 6:
        print("A senha deve ter pelo menos 6 caracteres")
        sys.exit(1)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user:
            user.is_dev = True
            user.role = "dev"
            user.hashed_password = hash_password(password)
            print(f"Usuário '{username}' atualizado como desenvolvedor.")
        else:
            oficina = db.query(Oficina).order_by(Oficina.id).first()
            if not oficina:
                # sem nenhuma oficina ainda: cria uma "interna" para ancorar o dev
                oficina = Oficina(nome="GiroCerto (interna)", ativa=True, setup_completo=True)
                db.add(oficina)
                db.flush()
            user = User(
                username=username,
                hashed_password=hash_password(password),
                oficina_id=oficina.id,
                nome_oficina="GiroCerto",
                is_dev=True,
                role="dev",
            )
            db.add(user)
            print(f"Usuário desenvolvedor '{username}' criado.")
        db.commit()
        print("Login no app leva direto ao painel /dev.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
