from fastapi import HTTPException, Depends
from typing import List

from auth import get_current_user
from models import User


def require_master(user: User = Depends(get_current_user)) -> User:
    if not user.is_master and user.role != "master":
        raise HTTPException(status_code=403, detail="Master access required")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_master and user.role not in ["master", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_not_dev(user: User = Depends(get_current_user)) -> User:
    if user.is_dev or user.role == "dev":
        raise HTTPException(status_code=403, detail="Developers cannot access workshop data")
    return user


def require_master_or_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_master and user.role not in ["master", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user


def require_mecanico(user: User = Depends(get_current_user)) -> User:
    if user.role not in ["master", "admin", "mecanico"]:
        raise HTTPException(status_code=403, detail="Acesso restrito a mecânicos, admins e masters")
    return user


def require_cash(user: User = Depends(get_current_user)) -> User:
    if user.role not in ["master", "admin"]:
        raise HTTPException(status_code=403, detail="Acesso restrito a admins e masters")
    return user