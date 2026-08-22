# Phase 2 explained — Backend foundation

This document teaches what we built in Phase 2 and *why*, with concrete
examples. Read it after skimming `backend/README.md`.

---

## 1. What we built (big picture)

```
Browser (React)          FastAPI (this phase)         PostgreSQL
     │                         │                          │
     │  GET /api/posts         │                          │
     │ ─────────────────────►  │  SELECT … JOIN …         │
     │                         │ ─────────────────────►   │
     │                         │ ◄─────────────────────   │
     │ ◄─────────────────────  │  JSON (camelCase)        │
```

Phase 1 faked this middle box with `frontend/src/mocks/api.ts`.
Phase 2 replaces that fake with a real server and a real database.

The React UI still uses mocks for now. **Phase 3** will point it at this API.
That is intentional: we verify the backend on its own (via `/docs` and curl)
before wiring the two together.

---

## 2. How to run it (reminder)

```bash
# Terminal 1 — database
docker compose up -d postgres

# Terminal 2 — API
cd backend
poetry run uvicorn app.main:app --reload --port 8000
```

Open http://127.0.0.1:8000/docs — that is an interactive catalogue of every
endpoint. You can click "Try it out" and call the API without writing curl.

Login for seeded data: `maya_builds` / `password123`

> **Port 5433:** another Postgres was already using 5432 on your machine, so
> DevHub maps container port 5432 → host port **5433**. The connection string
> in `backend/.env` reflects that.

---

## 3. Folder map (what lives where)

| Path | Job |
| --- | --- |
| `app/main.py` | Creates the FastAPI app, CORS, mounts `/api` |
| `app/core/config.py` | Reads `.env` (database URL, JWT secret) |
| `app/core/security.py` | bcrypt password hashing + JWT create/decode |
| `app/db/session.py` | Async connection pool; one session per request |
| `app/models/` | SQLAlchemy tables = PostgreSQL schema |
| `app/schemas/` | Pydantic shapes for request/response JSON |
| `app/api/routes/` | Endpoint handlers (`/posts`, `/auth`, …) |
| `app/api/serializers.py` | ORM row → JSON shape (adds `viewerVote`, etc.) |
| `alembic/` | Database migrations (versioned schema changes) |
| `scripts/seed.py` | Sample users/posts/comments for local dev |

**Rule of thumb:**

- **models** = how data is stored
- **schemas** = how data looks on the wire
- **routes** = what URLs do

Keeping those three separate is the most important backend habit in this phase.

---

## 4. Example walk-through: loading the home feed

### The request

```http
GET /api/posts?sort=hot HTTP/1.1
Host: 127.0.0.1:8000
```

### What FastAPI does

1. Matches the route in `app/api/routes/posts.py` → `list_posts`.
2. Injects a DB session via `Depends(get_db)`.
3. Optionally reads a Bearer token (anonymous is fine for reads).
4. Runs a SQLAlchemy query that **eager-loads** `author` and `community`
   (`selectinload`) so we do not hit the N+1 problem.
5. Sorts in Python with the same hot-rank formula as Phase 1.
6. Attaches `viewerVote` / `isMember` if someone is logged in.
7. Returns JSON that matches the frontend `Post` type (camelCase).

### Example response fragment

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "title": "We cut our Cloud Run cold starts...",
  "author": {
    "username": "maya_builds",
    "displayName": "Maya Chen",
    "karma": 12840
  },
  "community": {
    "slug": "cloud",
    "isMember": false
  },
  "score": 1284,
  "commentCount": 6,
  "viewerVote": 0
}
```

Notice `displayName` and `commentCount` — Python stores `display_name` /
`comment_count`. Pydantic's `alias_generator` converts snake_case ↔ camelCase
so the frontend does not need a translation layer.

---

## 5. Example walk-through: logging in

### The request

```http
POST /api/auth/login
Content-Type: application/json

{"username": "maya_builds", "password": "password123"}
```

### What happens

1. Look up the user by username.
2. `bcrypt.checkpw` compares the password to `password_hash` in the database.
3. If either step fails → **same** error: `"Incorrect username or password."`
   (We deliberately do not say "user not found" — that would help attackers
   enumerate accounts.)
4. On success, mint a JWT whose `sub` claim is the user id.
5. Return `{ accessToken, tokenType, user }`.

### Using the token later

```http
POST /api/posts/{id}/vote
Authorization: Bearer <accessToken>
Content-Type: application/json

{"value": 1}
```

`get_current_user` decodes the JWT, loads the user, and injects them into the
route. No token → 401 on write endpoints. Missing token on reads → anonymous
(viewerVote stays 0).

---

## 6. Example walk-through: voting (the score math)

Same rule as Phase 1:

```
next_vote = 0 if previous == clicked else clicked
score    += next_vote - previous
```

| Previous | Click | Next | Score change |
| --- | --- | --- | --- |
| 0 | upvote (+1) | +1 | +1 |
| +1 | upvote again | 0 (clear) | −1 |
| −1 | upvote | +1 | **+2** |

That last row is the one people get wrong if they hardcode `score += 1`.

Votes live in `post_votes` / `comment_votes`. Clearing a vote **deletes the
row** rather than storing `0` — absence means "no vote."

---

## 7. Example walk-through: nested comments

Database: one table, self-FK:

```
comments
  id
  post_id
  parent_id  ← NULL = top-level; otherwise points at another comment
  body
  ...
```

API: we load **all** comments for a post in one query, then assemble a tree in
`build_comment_tree()`:

```
[
  { id: cm1, replies: [
      { id: cm2, replies: [ { id: cm3, replies: [] } ] },
      { id: cm4, replies: [] }
  ]},
  { id: cm5, replies: [ { id: cm6, replies: [] } ]}
]
```

That matches what `CommentItem.tsx` already knows how to render.

---

## 8. Migrations (Alembic) — why not "just create tables"?

You *could* run `Base.metadata.create_all()` once. That falls apart the moment
you change a column: production already has data, and you need a repeatable
way to alter it.

Alembic stores scripts in `alembic/versions/`:

```bash
poetry run alembic revision --autogenerate -m "add foo column"
poetry run alembic upgrade head
```

Every environment runs the same scripts → same schema. That is how real teams
ship database changes.

---

## 9. Security habits already in place

| Habit | Where |
| --- | --- |
| Passwords hashed with bcrypt | `core/security.py` |
| Secrets from `.env`, not source | `core/config.py` |
| JWT for auth (not sessions yet) | `routes/auth.py` |
| Vague login errors | `routes/auth.py` |
| Server-side validation (Pydantic) | `schemas/` |
| Public user schema omits `password_hash` | `schemas/user.py` → `UserPublic` |
| Writes require auth; reads optional | `api/deps.py` |

Still coming later: refresh cookies, rate limiting (Redis), HTTPS, Secret Manager.

---

## 10. Try these yourself

```bash
# Feed
curl -s 'http://127.0.0.1:8000/api/posts?sort=top' | python3 -m json.tool | head

# Login and save token
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"maya_builds","password":"password123"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["accessToken"])')

# Create a post
curl -s -X POST http://127.0.0.1:8000/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Hello from curl","body":"It works.","communitySlug":"devops"}' \
  | python3 -m json.tool
```

Or use `/docs` — same thing, with a nicer UI.

---

## 11. What Phase 3 will change

Almost nothing in this backend. The frontend will:

1. Call `apiClient.post('/auth/login', …)` instead of the mock.
2. Store the access token (in memory) via `setAccessToken`.
3. Replace bodies of functions in `mocks/api.ts` with `apiClient.get/post`.

Because Phase 1 already used async functions with the same shapes, that swap
is the whole job.

---

## 12. Common mistakes this design avoids

1. **Returning ORM objects directly** → leaks `password_hash`. We use
   `UserPublic`.
2. **N+1 queries** → `selectinload(Post.author)` loads related rows in bulk.
3. **Hardcoding `localhost:5432`** → settings + `.env`.
4. **Sync DB calls inside `async def`** → we use asyncpg end to end.
5. **Storing vote `0` rows** → delete the row; absence means no vote.
