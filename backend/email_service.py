"""Envio de emails transacionais via Resend (https://resend.com).

Config por variáveis de ambiente:
  RESEND_API_KEY  - chave da API (sem ela, o email é apenas logado no console — modo dev)
  EMAIL_FROM      - remetente (default onboarding@resend.dev, que só entrega para o
                    email do dono da conta Resend; em produção use um domínio verificado)
  FRONTEND_URL    - base dos links enviados (default http://localhost:3000)
"""
import os
import logging

import requests

logger = logging.getLogger("girocerto.email")
logging.basicConfig(level=logging.INFO)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "GiroCerto <onboarding@resend.dev>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def send_email(to: str, subject: str, html: str) -> bool:
    if not RESEND_API_KEY:
        logger.info("[EMAIL DEV] RESEND_API_KEY ausente. Para: %s | Assunto: %s\n%s", to, subject, html)
        return True
    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html},
            timeout=15,
        )
        if resp.status_code in (200, 201):
            return True
        logger.error("Resend retornou %s: %s", resp.status_code, resp.text)
        return False
    except requests.RequestException as e:
        logger.error("Falha ao enviar email via Resend: %s", e)
        return False


def send_password_reset_email(to: str, username: str, token: str) -> bool:
    link = f"{FRONTEND_URL}/redefinir-senha?token={token}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #EA580C; margin-bottom: 8px;">GiroCerto</h2>
      <p>Olá, <strong>{username}</strong>!</p>
      <p>Recebemos um pedido para redefinir a sua senha. Clique no botão abaixo para criar uma nova senha:</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="{link}"
           style="background: #EA580C; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; display: inline-block; font-weight: bold;">
          Redefinir senha
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">O link expira em 1 hora. Se você não pediu a redefinição, ignore este email — sua senha continua a mesma.</p>
      <p style="color: #999; font-size: 12px;">Se o botão não funcionar, copie e cole este endereço no navegador:<br>{link}</p>
    </div>
    """
    return send_email(to, "GiroCerto - Redefinição de senha", html)
