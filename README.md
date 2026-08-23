# DevHub

A Reddit-style community discussion platform, built as a cloud-native
full-stack application. Users join communities, write posts, hold threaded
discussions, vote, and receive notifications.

This repository is as much a learning artifact as a product. Decisions are
documented where they are made, including the ones that were rejected and why.

---

## Current status

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Frontend foundation — React, routing, components, UI | **Complete** |
| 2 | Backend foundation — FastAPI, PostgreSQL, REST API | **Complete** |
| 3 | Integration — real authentication, live data | **Complete** |
| 4 | Advanced — Redis caching, notifications, WebSockets | **Complete** |
| 5 | Cloud — Docker, Terraform, GCP deployment | **Complete** (local Compose verified; GCP apply optional) |

Phase 5 packages the app as containers. Full local stack:

```bash
docker compose --profile full up --build
```

Then open http://localhost:8080 — notes: [`docs/phase-5-cloud.md`](docs/phase-5-cloud.md).

---

## Running it locally

Requires **Node 22 or newer**. If you use `nvm`:

```bash
nvm use 22
```

```bash
cd frontend
npm install
npm run dev
```

The app is served at http://localhost:5173.

To sign in, use any of the seeded usernames with any password:
`maya_builds`, `devon_ops`, `sam_writes_sql`, or `priya_ts`.

### Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |

---

## Repository layout

```
devhub/
├── frontend/          React + TypeScript single-page app  (Phase 1)
├── backend/           FastAPI service                      (Phase 2)
├── infra/terraform/   GCP infrastructure as code           (Phase 5)
├── docs/              Architecture and design notes
└── docker-compose.yml Local Postgres + Redis (+ full app with --profile full)
```

Only empty leftovers are “nice to haves” (custom domain, CI). `infra/terraform/`
has a GCP scaffold; apply only with a billing-enabled project.

### Inside `frontend/src`

```
src/
├── components/
│   ├── ui/         Generic primitives: Button, Card, Avatar, Skeleton
│   ├── layout/     App shell: Header, Sidebar, NotificationBell
│   ├── post/       Post feed: PostCard, PostList, VoteControl, SortTabs
│   ├── comment/    Threaded discussion: CommentThread, CommentItem
│   └── routing/    ProtectedRoute
├── pages/          One component per route
├── hooks/          Reusable logic: useAuth, usePostVote, useNotificationSocket
├── context/        AuthProvider and its context
├── lib/            Framework-agnostic helpers: apiClient, queryClient, format
├── mocks/          Seed data and the fake API  (deleted in Phase 3)
└── types/          Domain model — the single source of truth for data shapes
```

The organising principle is **grouping by role, not by file type**. A folder of
40 unrelated components called `components/` tells you nothing; `components/
comment/` tells you exactly where the discussion thread lives. Anything used by
more than one feature moves up into `ui/`.

---

## Architecture

Three tiers, communicating over HTTP:

```
Browser (React SPA)
        │  JSON over HTTPS
        ▼
FastAPI application  ──►  Redis      (cache, rate limits, pub/sub)
        │
        ▼
PostgreSQL           (source of truth)
```

The frontend never talks to the database. That boundary is what allows the tiers
to scale independently and — more importantly — it is the only place where
authorisation can actually be enforced, since the browser is fully under the
user's control.

Detailed reasoning lives in [`docs/architecture.md`](docs/architecture.md).

---

## How the API layer works

Every component fetches through `src/mocks/api.ts`. The **function names** are
the same as Phase 1; the **bodies** now call Axios against FastAPI:

```
Component  →  React Query  →  mocks/api.ts  →  /api/*  →  Vite proxy  →  FastAPI  →  Postgres
```

Vite proxies `/api` to port 8000 in development so the browser stays
same-origin. See [`docs/phase-3-integration.md`](docs/phase-3-integration.md).

---

## Notable decisions

**Vite, not Next.js.** The stack calls for React Router, Axios, and React Query.
Next.js brings its own router and data-fetching model, which would conflict with
all three. Vite also keeps the frontend and backend as genuinely separate tiers,
which is the boundary this project exists to teach.

**Server state is not component state.** Anything owned by the backend lives in
React Query, not `useState`. Data you did not create and cannot see change needs
caching, deduplication, and revalidation — reimplementing that per component is
how `useEffect` fetch bugs breed.

**Optimistic updates only where they are honest.** Voting updates the UI
immediately and rolls back on failure, because votes nearly always succeed and
the outcome is predictable. Posting a comment does not, because the server
assigns the ID and timestamp and may reject the content. See
`hooks/usePostVote.ts` and `hooks/useComments.ts`.

**A known advisory is accepted, not silently ignored.** `react-router-dom@7.18.1`
carries GHSA-qwww-vcr4-c8h2, a CSRF bypass in RSC mode. No patched release
exists above 7.18.1; `npm audit fix --force` only downgrades to 7.11.0. DevHub
is a client-rendered SPA that does not use RSC mode or router server actions, so
the vulnerable path is not reachable. This is recorded rather than suppressed,
and should be revisited when a patched version ships.

---

## Security notes for later phases

Phase 1 has no real security because it has no real data. These are the
obligations Phase 2 and 3 take on:

- Passwords hashed server-side with Argon2 or bcrypt. Never hash in the
  browser — the hash simply becomes the password.
- Short-lived access tokens held in memory; refresh tokens in `HttpOnly`,
  `Secure`, `SameSite` cookies so JavaScript cannot read them.
- Every validation rule in the frontend duplicated on the backend. Client-side
  checks are a convenience for honest users, never a control.
- Authorisation enforced per request via a FastAPI dependency. `ProtectedRoute`
  in this repo is a UX affordance and nothing more.
- Rate limiting on authentication endpoints, backed by Redis.

---

## License

Unlicensed personal learning project.
