# Phase 5 explained — Docker + cloud deploy

This is the phase where DevHub leaves “works on my laptop” and becomes
something you can run as containers — and, with a GCP project, deploy for real.

---

## 1. What changed (one sentence)

The API and frontend are **container images**; `docker compose --profile full`
runs Postgres + Redis + API + nginx SPA together; Terraform under
`infra/terraform/` describes the matching GCP shape (Cloud Run, Cloud SQL,
Memorystore, Secret Manager).

```
Browser → nginx (web) → FastAPI (api) → Postgres
                       ↘              ↘ Redis
```

Same relative `/api` URLs as Phase 3. Vite’s proxy is replaced by nginx in
production.

---

## 2. Run the full stack locally

```bash
# From the repo root
docker compose --profile full up --build
```

| URL | What |
| --- | --- |
| http://localhost:8080 | SPA (use this) |
| http://localhost:8000/docs | API docs |
| localhost:5433 | Postgres (host tools) |
| localhost:6380 | Redis |

Login: `maya_builds` / `password123` (seed runs on API start when `RUN_SEED=true`).

Infra only (Phases 2–4 style — API/Vite on the host):

```bash
docker compose up -d postgres redis
```

Stop the full stack:

```bash
docker compose --profile full down
```

---

## 3. Why Docker (and multi-stage builds)

A **Dockerfile** is a recipe for an image. An **image** is a snapshot; a
**container** is a running instance.

We use **two stages**:

| Stage | Backend | Frontend |
| --- | --- | --- |
| Build | Poetry → `requirements.txt` | `npm ci` + `vite build` |
| Runtime | Slim Python + uvicorn | nginx + `dist/` |

The final image does not need the compiler toolchain — smaller uploads and
faster Cloud Run cold starts.

---

## 4. Why nginx in front of React

1. Vite is a **dev** server. Production needs a static file server.
2. **SPA fallback:** refresh on `/posts/abc` must return `index.html`, not 404.
3. **Reverse proxy:** `/api` → FastAPI so the browser stays same-origin.
   WebSocket `Upgrade` headers are forwarded for live notifications.

`BACKEND_UPSTREAM` / `BACKEND_SCHEME` / `LISTEN_PORT` are env vars so the
*same* image works in Compose (`api:8000`, port 80) and Cloud Run
(`….run.app`, port 8080).

---

## 5. API entrypoint

`backend/docker-entrypoint.sh` runs `alembic upgrade head` (and optional seed)
before uvicorn. Schema changes ship with the image; the container applies them
on boot.

---

## 6. Terraform / GCP (optional, costs money)

Declared under `infra/terraform/`:

| Resource | Role |
| --- | --- |
| Artifact Registry | Stores `api` and `web` images |
| VPC + connector | Cloud Run → private SQL / Redis |
| Cloud SQL Postgres | Source of truth |
| Memorystore Redis | Cache, rate limits, pub/sub |
| Secret Manager | `DATABASE_URL`, `JWT_SECRET_KEY`, `REDIS_URL` |
| Cloud Run × 2 | `devhub-api`, `devhub-web` |

**Order that usually works:**

1. Create a GCP project with billing.
2. `gcloud auth application-default login`
3. Copy `terraform.tfvars.example` → `terraform.tfvars`, set `project_id`.
4. Create Artifact Registry (or apply once with placeholder images carefully).
5. Build & push images to `REGION-docker.pkg.dev/PROJECT/devhub/…`.
6. Set `api_image` / `web_image` in tfvars → `terraform apply`.
7. Open the `web_url` output.

**Destroy when done** — Cloud SQL and Memorystore bill while they exist:

```bash
cd infra/terraform && terraform destroy
```

Remote Terraform state (GCS bucket + locking) is commented in `versions.tf`;
turn it on once you have a state bucket so secrets in state are not only local.

---

## 7. Mental model: Compose vs Cloud Run

| Concern | Compose | Cloud Run |
| --- | --- | --- |
| How many API boxes? | One | Many (scale to zero) |
| How they find Redis | Service name `redis` | Memorystore private IP via VPC |
| Secrets | Compose `environment:` | Secret Manager |
| Frontend → API | Docker network `api:8000` | HTTPS to API’s `*.run.app` |

Phase 4’s Redis pub/sub exists so notifications still work when “many API
boxes” becomes real.

---

## 8. What’s next (beyond Phase 5)

Custom domain + HTTPS load balancer, CI to build/push on git push, HttpOnly
refresh cookies, image uploads to Cloud Storage, pagination, tests.
