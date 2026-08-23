# Phase 3 explained — Frontend ↔ Backend

This is the phase where the React app stops using fake data and talks to the
real FastAPI + PostgreSQL stack from Phase 2.

---

## 1. What changed (one sentence)

The **seam** (`frontend/src/mocks/api.ts`) still exports the same function
names (`fetchFeed`, `votePost`, …), but each function now calls Axios instead
of reading an in-memory array.

```
Before:  Component → mocks/api.ts → JavaScript arrays
After:   Component → mocks/api.ts → Axios → Vite proxy → FastAPI → Postgres
```

Almost no page components needed rewriting. That was the payoff of Phase 1.

---

## 2. How to run everything

You need **three** processes:

```bash
# 1. Database
docker compose up -d postgres

# 2. API (from backend/)
poetry run uvicorn app.main:app --reload --port 8000

# 3. Frontend (from frontend/)
npm run dev
```

Then open http://127.0.0.1:5173

Login: `maya_builds` / `password123`

---

## 3. The Vite proxy (why you don’t see CORS errors)

`vite.config.ts` forwards browser calls:

```
Browser requests  http://127.0.0.1:5173/api/posts
Vite proxies to   http://127.0.0.1:8000/api/posts
```

The browser thinks everything is same-origin (`5173`). FastAPI still receives
the request on `8000`. No CORS preflight drama in local dev.

`apiClient` uses `baseURL: '/api'` on purpose — never hardcode
`http://localhost:8000` in frontend code.

---

## 4. Auth flow (example)

### Login

1. User submits the form on `/login`.
2. `AuthProvider.login` calls `POST /api/auth/login`.
3. Backend checks bcrypt hash, returns `{ accessToken, user }`.
4. Frontend:
   - `setAccessToken(token)` — Axios attaches `Authorization: Bearer …`
   - `sessionStorage.setItem('devhub.accessToken', token)` — survives refresh
   - `setUser(user)` — header switches to logged-in UI

### Refreshing the page

1. `AuthProvider` mounts, sees a token in `sessionStorage`.
2. Calls `GET /api/auth/me`.
3. If valid → restore user. If not → clear token (quiet logout).

### Example curl (same path the UI uses, via the proxy)

```bash
curl -s -X POST http://127.0.0.1:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"maya_builds","password":"password123"}'
```

---

## 5. Voting (example)

UI still calls `votePost(id, 1)` from `usePostVote`.

That now becomes:

```http
POST /api/posts/{id}/vote
Authorization: Bearer <token>
{"value": 1}
```

The server applies toggle math (same as Phase 1/2). Optimistic UI still runs
in React Query; the network is just real now.

---

## 6. Files to read

| File | Why |
| --- | --- |
| `src/mocks/api.ts` | Every HTTP call in one place |
| `src/lib/apiClient.ts` | Axios instance + Bearer header |
| `src/context/AuthProvider.tsx` | Real login/register/session restore |
| `vite.config.ts` | `/api` proxy |

`src/mocks/data.ts` is obsolete (empty stub) — the old seed arrays are gone
from the running app.

---

## 7. Security honesty check

| Done in Phase 3 | Still later |
| --- | --- |
| Passwords checked server-side (bcrypt) | HttpOnly refresh cookies |
| JWT on each request | Redis rate limiting on login |
| Public user JSON has no password hash | Shorter access-token TTL + rotate |
| Token not in localStorage | — |

`sessionStorage` is a learning/dev compromise so refresh works. XSS can still
read it. Production path: short-lived access token in memory + refresh token
in an HttpOnly cookie.

---

## 8. Common failures

| Symptom | Likely cause |
| --- | --- |
| Feed empty / network error | Backend not running on :8000 |
| Login always fails | Wrong password, or DB not seeded |
| 404 on `/api/...` from browser | Vite not running (proxy missing) |
| Join button 401 | Not logged in |

---

## 9. What’s next (Phase 4)

Done — see [`phase-4-redis.md`](phase-4-redis.md): Redis feed cache, auth rate
limits, and live notifications via Pub/Sub + WebSockets.
