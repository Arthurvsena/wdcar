"""Registro de auditoria: quem fez o quê, quando.

O helper apenas adiciona a linha na sessão — o commit fica por conta do
endpoint chamador, para que a auditoria entre na mesma transação da ação.
"""
from sqlalchemy.orm import Session

from models import AuditLog, User


def audit(
    db: Session,
    user: User,
    acao: str,
    entidade: str = None,
    entidade_id: int = None,
    detalhe: str = None,
    oficina_id: int = None,
):
    db.add(AuditLog(
        oficina_id=oficina_id if oficina_id is not None else (user.oficina_id if user else None),
        user_id=user.id if user else None,
        username=user.username if user else None,
        acao=acao,
        entidade=entidade,
        entidade_id=entidade_id,
        detalhe=detalhe,
    ))
