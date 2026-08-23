# Phase 4 explained — Redis (cache, rate limits, live notifications)

This is the phase where the API stops being a single-machine toy and starts
behaving like something that can survive multiple Cloud Run instances.

---

## 1. What changed (one sentence)

**Redis** sits beside Postgres as a shared, in-memory sidekick: it caches the
sorted feed, counts auth attempts, and fans out notification events to
whatever API process holds a user's WebSocket.

```
Browser ──WS──► FastAPI instance A ──subscribe──► Redis Pub/Sub
Comment POST ─► FastAPI instance B ──publish────► Redis Pub/Sub
                      │
                      └──► Postgres (source of truth)
```

Locally you still run one API process. Pub/Sub looks like overkill until you
remember Cloud Run will have many.

---

## 2. How to run everything

You need **four** pieces (Postgres + Redis in Docker, then API + frontend):

```bash
# 1. Infra
docker compose up -d postgres redis

# 2. API (from backend/) — needs REDIS_URL in .env
poetry run uvicorn app.main:app --reload --port 8000

# 3. Frontend (from frontend/)
npm run dev
```

`.env` (see `.env.example`):

```
REDIS_URL=redis://localhost:6380/0
```

Host port **6380** maps to container 6379 so it does not collide with other
local Redis containers.

Login: `maya_builds` / `password123`

---

## 3. Three jobs for one Redis

| Job | Key / channel | Why Redis |
| --- | --- | --- |
| Feed cache | `feed:hot`, `feed:new`, `feed:top` | Sorting every post on every homepage hit is wasted work |
| Auth rate limit | `ratelimit:login:{ip}` | Counters must be shared across instances |
| Live notifications | `user:{id}:notifications` | The write and the WebSocket usually land on different instances |

Redis is **not** the source of truth. If it dies:

- Feed: recompute from Postgres (slower, still correct)
- Rate limit: temporarily open (fail open vs fail closed is a product choice; we fail closed on Redis errors at startup)
- Pub/Sub: live push pauses; GET `/notifications` still works from Postgres

---

## 4. Feed cache — shared data only

```
GET /api/posts?sort=hot
  1. Redis GET feed:hot
  2. Miss → query Postgres, sort, SET with TTL (~60s)
  3. Overlay THIS viewer's viewerVote + community.isMember from Postgres
  4. Return
```

**Never** put `viewerVote` or `isMember` in the shared key. Caching Maya's
upvote and serving it to Devon is both a bug and a privacy leak.

Writes that change the feed (create post, vote, comment) call
`invalidate_feed_cache()` and delete all three sort keys. Blunt on purpose:
three keys are cheaper than surgically patching a list.

Code: `backend/app/core/cache.py`, wired in `routes/posts.py` and comments.

---

## 5. Rate limiting login / register

```
INCR ratelimit:login:127.0.0.1
if count == 1 → EXPIRE 60
if count > 10 → HTTP 429
```

Why not a Python `dict`? Each Cloud Run instance has its own memory. An
attacker could spray a few requests at each instance and never trip a local
limit. Redis makes the counter global.

Code: `backend/app/core/rate_limit.py`, used in `routes/auth.py`.

---

## 6. Live notifications (Pub/Sub + WebSocket)

### Persist first

`notify_user()` writes a `notifications` row, then publishes the same JSON to
Redis. Refreshing the page still shows history via GET `/api/notifications`.

### Fan-out

1. Devon comments on Maya's post → instance B publishes to
   `user:{maya_id}:notifications`
2. Every instance pattern-subscribes to `user:*:notifications`
3. Instance A (holding Maya's socket) receives the message and
   `send_json`s it down the WebSocket
4. Frontend hook prepends it into the React Query cache

### Frontend

- Vite proxy: `ws: true` on `/api`
- Hook: `frontend/src/hooks/useNotificationSocket.ts`
- Token travels as `?token=` because browsers cannot set Authorization on the
  WebSocket handshake the way Axios does for HTTP. Keep access tokens short-lived.

Triggers today: **comment on your post** and **reply to your comment**
(never notifies yourself).

---

## 7. Lifespan wiring

```python
# app/main.py
await init_redis()
start_notification_listener()
...
await stop_notification_listener()
await close_redis()
```

One Redis client + one background subscriber task per process. Same idea as
the SQLAlchemy engine: connect once, share everywhere.

---

## 8. How to verify quickly

```bash
# Cache key appears after a feed load
curl -s 'http://127.0.0.1:8000/api/posts?sort=hot' > /dev/null
docker exec devhub-redis redis-cli GET feed:hot | head -c 80

# Comment as devon while maya is logged in in the browser —
# the bell should update without a refresh.
```

Spam login with a bad password ~11 times → `429 Too Many Requests`.

---

## 9. What’s next (Phase 5)

Done — see [`phase-5-cloud.md`](phase-5-cloud.md): Docker images, full Compose
profile, and Terraform for GCP (Cloud Run / SQL / Memorystore).
