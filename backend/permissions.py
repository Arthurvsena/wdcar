from fastapi import HTTPException, Depends
from typing import List

from auth import get_current_user
from models import User

ALL_MODULES = [
    "dashboard", "clientes", "pecas", "servicos", "os", "mecanico",
    "financeiro", "caixa", "fornecedores", "compras", "garantia",
    "historico", "analytics", "health", "relatorios", "configuracoes",
]

PERMISSOES_DEFAULT = {
    "master": list(ALL_MODULES),
    "admin": list(ALL_MODULES),
    "mecanico": ["os", "mecanico", "historico", "garantia"],
    "user": ["dashboard", "clientes", "pecas", "servicos", "os", "analytics"],
    "dev": [],
}


def get_user_modules(user: User) -> set:
    """Módulos que o usuário pode acessar. Master/admin acessam tudo; para os
    demais vale a lista User.permissoes (CSV), com fallback no default do role
    para não travar usuários antigos sem a coluna preenchida."""
    if user.is_master or user.role in ("master", "admin"):
        return set(ALL_MODULES)
    perms = [p.strip() for p in (user.permissoes or "").split(",") if p.strip()]
    if not perms:
        perms = PERMISSOES_DEFAULT.get(user.role, [])
    return set(perms)


def require_permission(module: str):
    """Dependency de router/endpoint: valida no backend a permissão de módulo
    que antes só existia no frontend."""
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.is_dev or user.role == "dev":
            raise HTTPException(status_code=403, detail="Developers cannot access workshop data")
        if module not in get_user_modules(user):
            raise HTTPException(status_code=403, detail=f"Sem permissão para o módulo '{module}'")
        return user
    return checker


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