# DevHub backend

FastAPI + PostgreSQL application tier for DevHub.

## Quick start

```bash
# 1. Start Postgres (from repo root) — uses host port 5433
docker compose up -d postgres

# 2. Install deps + migrate + seed
cd backend
poetry install
poetry run alembic upgrade head
poetry run python -m scripts.seed

# 3. Run the API
poetry run uvicorn app.main:app --reload --port 8000
```

- API docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

Seed logins (password for all): `password123`

- `maya_builds`
- `devon_ops`
- `sam_writes_sql`
- `priya_ts`

## Layout

```
app/
  main.py           FastAPI app + CORS
  core/             settings, password hashing, JWT
  db/               engine, session, Base
  models/           SQLAlchemy tables
  schemas/          Pydantic request/response (camelCase for frontend)
  api/
    deps.py         get_db, current user
    serializers.py  ORM → API shapes
    routes/         endpoint handlers
scripts/seed.py     sample data
alembic/            migrations
```
