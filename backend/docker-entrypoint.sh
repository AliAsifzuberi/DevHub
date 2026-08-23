#!/bin/sh
# API container entrypoint.
#
# Purpose: migrate the schema (and optionally seed) before the server listens.
# Cloud Run / Compose both start the container with env vars already set;
# Alembic reads DATABASE_URL via app settings the same way uvicorn does.
set -e

echo "Running database migrations…"
alembic upgrade head

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Seeding sample data…"
  python -m scripts.seed
fi

# Cloud Run sets PORT; default to 8000 for local Compose.
PORT="${PORT:-8000}"
echo "Starting uvicorn on 0.0.0.0:${PORT}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
