import json, os, shutil, secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import User, Oficina, PasswordResetToken
from schemas import UserCreate, UserUpdate, UserPasswordChange, UserCreateByAdmin, Token, UserOut
from auth import hash_password, verify_password, create_access_token, get_current_user
from permissions import require_master_or_admin, PERMISSOES_DEFAULT
from email_service import send_password_reset_email
from audit import audit
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["auth"])

AVATAR_DIR = "uploads/avatars"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_MIMETYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024
os.makedirs(AVATAR_DIR, exist_ok=True)


@router.post("/register", response_model=Token)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    # SaaS: cadastro público só funciona como bootstrap da primeira conta.
    # Novas oficinas são criadas pelo painel do desenvolvedor (/dev/oficinas).
    if db.query(User.id).first() is not None:
        raise HTTPException(
            status_code=403,
            detail="Cadastro desabilitado. Entre em contato para criar a conta da sua oficina.",
        )
    oficina = Oficina(nome=payload.nome_oficina, ativa=True, setup_completo=True)
    db.add(oficina)
    db.flush()
    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        oficina_id=oficina.id,
        nome_oficina=payload.nome_oficina,
        is_master=True,
        role="master",
        permissoes=",".join(PERMISSOES_DEFAULT.get("master", [])),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({
        "user_id": user.id,
        "oficina_id": user.oficina_id,
        "role": user.role,
        "is_master": user.is_master,
        "is_dev": user.is_dev,
    })
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_dev:
        oficina = db.query(Oficina).filter(Oficina.id == user.oficina_id).first()
        if oficina and not oficina.ativa:
            raise HTTPException(status_code=403, detail="Conta desativada. Entre em contato com o suporte.")
    audit(db, user, "login")
    db.commit()
    token = create_access_token({
        "user_id": user.id,
        "oficina_id": user.oficina_id,
        "role": user.role,
        "is_master": user.is_master,
        "is_dev": user.is_dev,
    })
    return Token(access_token=token, user=UserOut.model_validate(user))


class ForgotPasswordIn(BaseModel):
    identificador: str  # username ou email


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str


RESET_TOKEN_TTL = timedelta(hours=1)


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    ident = payload.identificador.strip()
    user = db.query(User).filter(
        (User.username == ident) | (User.email == ident)
    ).first()
    # resposta idêntica exista ou não o usuário, para não permitir enumeração
    generic = {"ok": True, "detail": "Se o usuário tiver um email cadastrado, enviamos o link de recuperação."}
    if not user or not user.email:
        return generic
    token = secrets.token_urlsafe(32)
    db.add(PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + RESET_TOKEN_TTL,
    ))
    db.commit()
    send_password_reset_email(user.email, user.username, token)
    return generic


@router.post("/reset-password")
@limiter.limit("10/minute")
def reset_password(request: Request, payload: ResetPasswordIn, db: Session = Depends(get_db)):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres")
    prt = db.query(PasswordResetToken).filter(PasswordResetToken.token == payload.token).first()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not prt or prt.used or prt.expires_at < now:
        raise HTTPException(status_code=400, detail="Link inválido ou expirado. Solicite uma nova recuperação.")
    user = db.query(User).filter(User.id == prt.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Usuário não encontrado")
    user.hashed_password = hash_password(payload.new_password)
    prt.used = True
    audit(db, user, "reset_senha")
    db.commit()
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.put("/me", response_model=UserOut)
def update_me(payload: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.username is not None:
        existing = db.query(User).filter(User.username == payload.username, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = payload.username
    if payload.nome_oficina is not None:
        # nome da oficina agora é entidade própria: só master/admin alteram,
        # e a mudança propaga para a oficina e todos os seus usuários
        if user.is_master or user.role in ("master", "admin"):
            nome = payload.nome_oficina.strip()
            if nome:
                oficina = db.query(Oficina).filter(Oficina.id == user.oficina_id).first()
                if oficina:
                    oficina.nome = nome
                db.query(User).filter(User.oficina_id == user.oficina_id).update(
                    {User.nome_oficina: nome}, synchronize_session=False
                )
                user.nome_oficina = nome
    if payload.email is not None:
        user.email = payload.email
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/me/avatar", response_model=UserOut)
def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Extension '{ext}' not allowed. Use: {', '.join(sorted(ALLOWED_EXTENSIONS))}")
    if file.content_type not in ALLOWED_MIMETYPES:
        raise HTTPException(status_code=400, detail=f"File type '{file.content_type}' not allowed")
    contents = file.file.read(MAX_AVATAR_SIZE + 1)
    if len(contents) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_AVATAR_SIZE // (1024*1024)}MB")
    filename = f"user_{user.id}{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    avatar_url = f"/uploads/avatars/{filename}"
    if user.avatar:
        old_path = os.path.join(AVATAR_DIR, os.path.basename(user.avatar))
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass
    user.avatar = avatar_url
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.put("/me/password")
def change_password(payload: UserPasswordChange, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


@router.get("/users", response_model=list[UserOut])
def list_users(user: User = Depends(require_master_or_admin), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.oficina_id == user.oficina_id).all()
    return [UserOut.model_validate(u) for u in users]


@router.post("/users", response_model=UserOut)
def create_user(payload: UserCreateByAdmin, user: User = Depends(require_master_or_admin), db: Session = Depends(get_db)):
    if payload.is_dev and not user.is_master:
        raise HTTPException(status_code=403, detail="Only master can create dev users")
    if not payload.username or not payload.password:
        raise HTTPException(status_code=400, detail="Username and password are required")
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    role = payload.role.value if payload.role else "user"
    permissoes = payload.permissoes if payload.permissoes is not None else ",".join(PERMISSOES_DEFAULT.get(role, []))
    novo = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        oficina_id=user.oficina_id,
        email=payload.email,
        permissoes=permissoes,
        role=role,
        is_dev=payload.is_dev if payload.is_dev is not None else False,
    )
    db.add(novo)
    db.flush()
    audit(db, user, "usuario_criado", "user", novo.id, detalhe=f"{novo.username} ({novo.role})")
    db.commit()
    db.refresh(novo)
    return UserOut.model_validate(novo)


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserCreateByAdmin, current_user: User = Depends(require_master_or_admin), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id, User.oficina_id == current_user.oficina_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.is_dev and not current_user.is_master:
        raise HTTPException(status_code=403, detail="Only master can modify dev status")
    if payload.username is not None and payload.username != target.username:
        existing = db.query(User).filter(User.username == payload.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        target.username = payload.username
    if payload.password:
        target.hashed_password = hash_password(payload.password)
    if payload.email is not None:
        target.email = payload.email
    if payload.role is not None:
        new_role = payload.role.value
        role_changed = new_role != target.role
        target.role = new_role
        if role_changed and payload.permissoes is None:
            # Reset permissoes to the default set for the new role so a role
            # change (e.g. promoting a mecanico to admin) doesn't leave the
            # user with stale permissions from the previous role.
            target.permissoes = ",".join(PERMISSOES_DEFAULT.get(new_role, []))
    if payload.permissoes is not None:
        target.permissoes = payload.permissoes
    if payload.is_dev is not None and current_user.is_master:
        target.is_dev = payload.is_dev
    db.commit()
    db.refresh(target)
    return UserOut.model_validate(target)


@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(require_master_or_admin), db: Session = Depends(get_db)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    target = db.query(User).filter(User.id == user_id, User.oficina_id == current_user.oficina_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    audit(db, current_user, "usuario_excluido", "user", target.id, detalhe=target.username)
    db.delete(target)
    db.commit()
    return {"ok": True}


@router.post("/migrate-permissions")
def migrate_permissions(current_user: User = Depends(require_master_or_admin), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.oficina_id == current_user.oficina_id).all()
    updated = 0
    for u in users:
        if not u.permissoes:
            u.permissoes = ",".join(PERMISSOES_DEFAULT.get(u.role, []))
            updated += 1
    db.commit()
    return {"ok": True, "updated": updated}
