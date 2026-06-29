# Plano de Evolução - WDOcar Gestão de Oficina Mecânica

## Visão Geral do Sistema

O WDOcar é um sistema completo de gestão para oficina mecânica. Stack: Python FastAPI + React com Tailwind CSS. Banco SQLite com SQLAlchemy.

## Status das Etapas

| Step | Descrição | Status | Notas |
|---|---|---|---|
| 1 | Refatorar/Modularizar Routers | ❌ Não feito | Separar lógica em serviços |
| 2 | Fornecedores e Compras | ✅ Feito | Backend + Frontend |
| 3 | Garantia e Histórico Veículo | ✅ Feito | Backend + Frontend |
| 4 | Fluxo de Caixa Diário | ✅ Feito | Backend + Frontend |
| 5 | Painel do Mecânico | ❌ Não feito | UX mobile-first |
| 6 | Relatórios e Exportações | ✅ Feito | CSV export |
| 7 | Testes Unitários | ❌ Não feito | pytest, 80%+ coverage |
| 8 | Documentar API | ❌ Não feito | OpenAPI/Swagger |
| 9 | Deploy e Dockerfile | ❌ Não feito | Multi-estágio |
| 10 | Integrações Externas | ❌ Não feito | WhatsApp, CEP |

**Progresso: 4/10 etapas concluídas**

## Feitos Além do Roadmap

- Correção bug crítico `[REDACTED]` nos arquivos core
- Sistema de permissões aprimorado (16 módulos, 5 roles)
- Cache-busting no browser (meta tags no-cache)
- AuthContext com dados frescos do backend (`/auth/me`)
- Migração de permissões no banco
- `iniciar.bat` com menu Docker/dev

## Próximos Passos (Recomendados)

1. **Step 5**: Painel do Mecânico (UX mobile-first)
2. **Step 7**: Testes Unitários (pytest)
3. **Step 1**: Refatorar Routers (serviços dedicados)
4. **Step 8**: Documentar API
5. **Step 9**: Deploy e Docker

## Stack

- **Backend**: Python 3.12+ / FastAPI / SQLAlchemy / SQLite
- **Frontend**: React 19 / Vite / Tailwind CSS
- **DB**: `wdocar.db`
- **Portas**: Backend 8000, Frontend 3000
