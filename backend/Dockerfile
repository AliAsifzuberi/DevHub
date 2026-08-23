# syntax=docker/dockerfile:1
#
# Multi-stage API image for DevHub.
#
# Stage 1 exports a pinned requirements.txt from Poetry (reproducible, no
# Poetry runtime in the final image). Stage 2 is a slim Python runtime with
# only production deps — smaller cold starts on Cloud Run.
#
# Build from repo root:
#   docker build -f backend/Dockerfile -t devhub-api ./backend

FROM python:3.12-slim AS deps

WORKDIR /build

RUN pip install --no-cache-dir "poetry>=2.0" "poetry-plugin-export>=1.8"

COPY pyproject.toml poetry.lock ./
# Export main deps only — skip the [dependency-groups] dev tools.
RUN poetry export --without-hashes --only main -o requirements.txt


FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /build/requirements.txt .
RUN pip install -r requirements.txt

COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
COPY scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Cloud Run injects PORT; local Compose uses 8000.
ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
