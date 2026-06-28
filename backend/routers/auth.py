import json, os, shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserUpdate, UserPasswordChange, UserCreateByAdmin, Token, UserOut
from auth import hash_password, verify_password, create_access_token, get_current_user
from permissions import require_master_or_admin

router = APIRouter(prefix="/auth", tags=["auth"])

AVATAR_DIR = "uploads/avatars"
os.makedirs(AVATAR_DIR, exist_ok=True)


@router.post("/register", response_model=Token)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    max_oficina = db.query(User.oficina_id).order_by(User.oficina_id.desc()).first()
    next_oficina_id = (max_oficina[0] + 1) if max_oficina else 1
    is_first_user = max_oficina is None
    is_master = is_first_user
    role = "master" if is_first_user else "user"
    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        oficina_id=next_oficina_id,
        nome_oficina=payload.nome_oficina,
        is_master=is_master,
        role=role,
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
def login(payload: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({
        "user_id": user.id,
        "oficina_id": user.oficina_id,
        "role": user.role,
        "is_master": user.is_master,
        "is_dev": user.is_dev,
    })
    return Token(access_token=token, user=UserOut.model_validate(user))


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
        user.nome_oficina = payload.nome_oficina
    if payload.email is not None:
        user.email = payload.email
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/me/avatar", response_model=UserOut)
def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
    filename = f"user_{user.id}{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
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
    novo = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        oficina_id=user.oficina_id,
        email=payload.email,
        permissoes=payload.permissoes,
        role=payload.role.value if payload.role else "user",
        is_dev=payload.is_dev if payload.is_dev is not None else False,
    )
    db.add(novo)
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
    if payload.permissoes is not None:
        target.permissoes = payload.permissoes
    if payload.role is not None:
        target.role = payload.role.value
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
    db.delete(target)
    db.commit()
    return {"ok": True}
