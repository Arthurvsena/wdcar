# Deploy do GiroCerto (WDCar)

Arquitetura de produção:

- **Frontend (React/CRA)** → **Vercel**
- **Backend (FastAPI)** → **Render** (ou Railway) — precisa de processo contínuo por
  causa do agendador (APScheduler) e dos uploads em disco; por isso **não** vai na Vercel.
- **Banco** → **Neon (Postgres)**, o mesmo do ArtMoney, mas em um **schema próprio**.

## Isolamento no banco (importante)

Dois níveis de separação, ambos já garantidos:

1. **Entre projetos** — cada app usa um **schema Postgres** dentro do mesmo banco `neondb`:
   - ArtMoney → `finance_app`
   - GiroCerto → `giro_app`  (definido por `DB_SCHEMA`; o backend cria o schema e
     direciona todas as tabelas para ele via `search_path`). As tabelas de um projeto
     nunca colidem com as do outro.
2. **Entre oficinas** — dentro do GiroCerto, cada oficina só enxerga seus próprios dados
   (clientes, OS, peças, financeiro). Isso é feito por `oficina_id` em cada tabela e
   filtrado em todos os endpoints. Um usuário de uma oficina não acessa dados de outra.

> Nada a fazer manualmente no Neon: ao subir o backend com `DATABASE_URL` apontando pro
> Neon, ele executa `CREATE SCHEMA IF NOT EXISTS giro_app` e cria as tabelas lá.

---

## 1) Backend no Render

1. Faça login em https://render.com com sua conta (GitHub).
2. **New → Blueprint** e aponte para este repositório. O Render lê o `render.yaml` da raiz.
3. Defina as variáveis marcadas como `sync: false`:
   - `DATABASE_URL` = connection string **pooled** do Neon (a mesma base do ArtMoney):
     `postgresql://neondb_owner:SENHA@ep-little-lake-atbqi6p5-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - `ALLOWED_ORIGINS` = a URL do frontend na Vercel (preencha após o passo 2), ex.:
     `https://girocerto.vercel.app`
   - `FRONTEND_URL` = mesma URL do frontend.
   - `RESEND_API_KEY` = opcional (reset de senha por email).
   - `DB_SCHEMA` (`giro_app`), `ENV` (`production`) e `JWT_SECRET_KEY` (gerado) já vêm do blueprint.
4. Deploy. Anote a URL pública do backend, ex.: `https://girocerto-backend.onrender.com`.

Alternativa (Railway): New Project → Deploy from repo → **Root Directory = `backend`**;
ele detecta o `Procfile`. Configure as mesmas variáveis de ambiente.

## 2) Frontend na Vercel

1. Login em https://vercel.com (mesma conta/team `arthurvsenas-projects` do ArtMoney).
2. **Add New → Project** → importe este repositório.
3. **Root Directory = `frontend`** (o `vercel.json` cuida do build CRA e do roteamento SPA).
4. Variável de ambiente:
   - `REACT_APP_API_URL` = URL do backend do passo 1 (ex.: `https://girocerto-backend.onrender.com`).
5. Deploy. Anote a URL, ex.: `https://girocerto.vercel.app`.
6. **Volte ao Render** e ajuste `ALLOWED_ORIGINS` e `FRONTEND_URL` para essa URL; redeploy do backend.

## 3) Criar o acesso de desenvolvedor (primeiro login)

O banco começa vazio. Crie o usuário **dev** (painel `/dev`, onde se cadastram as oficinas):

```bash
# com DATABASE_URL apontando pro Neon:
cd backend
DATABASE_URL="postgresql://neondb_owner:SENHA@ep-little-lake-atbqi6p5-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require" \
DB_SCHEMA=giro_app \
python create_dev.py SEU_USUARIO SUA_SENHA
```

Depois é só logar no frontend com esse usuário → painel `/dev` → **Nova oficina** para
criar cada oficina (cada uma com seu próprio usuário master e dados isolados).

---

## Notas / limitações

- **Uploads (logos, avatars)**: ficam no disco do backend. No plano free do Render o disco é
  efêmero (some em cada redeploy). Para persistir, adicione um **Disk** no Render (ou
  Volume no Railway) montado em `backend/uploads`, ou migre para storage externo depois.
- **Backups**: o job diário grava em `backend/data/backups`; use o mesmo Disk para persistir.
- **`channel_binding=require`**: se o driver reclamar, remova esse parâmetro da `DATABASE_URL`
  (mantenha `sslmode=require`).
- **Segredos**: nunca commitados — ficam só nos painéis do Render/Vercel. `backend/.env` é
  gitignored; use `backend/.env.example` como referência.
