# DevHub — Complete Beginner Guide

**What this document is:** one place that explains *everything we built*, *why we
built it that way*, and *how the code actually works* — with walkthroughs you can
follow file by file.

**Who it is for:** you are new (or fairly new) to React and Python. You can read
basic JavaScript. You do not need prior FastAPI or PostgreSQL experience.

**How to use it:**

1. Read sections 1–4 once for the big picture.
2. Follow the walkthroughs in sections 7–9 with the app running.
3. Use the glossary at the end when a word feels fuzzy.

You should finish this document able to explain DevHub to someone else without
opening Slack to ask “wait, why is the token in sessionStorage?”

---

## Table of contents

1. [What we built and why it exists](#1-what-we-built-and-why-it-exists)
2. [The three phases — the story in order](#2-the-three-phases--the-story-in-order)
3. [How a web app actually works](#3-how-a-web-app-actually-works)
4. [How to run everything locally](#4-how-to-run-everything-locally)
5. [React from zero (ideas that matter)](#5-react-from-zero-ideas-that-matter)
6. [Frontend tour — folders and responsibilities](#6-frontend-tour--folders-and-responsibilities)
7. [Frontend walkthroughs — real clicks, real code](#7-frontend-walkthroughs--real-clicks-real-code)
8. [Python + FastAPI from zero](#8-python--fastapi-from-zero)
9. [Backend tour — folders and responsibilities](#9-backend-tour--folders-and-responsibilities)
10. [Backend walkthroughs — login, feed, votes, comments](#10-backend-walkthroughs--login-feed-votes-comments)
11. [Phase 3 — how frontend and backend meet](#11-phase-3--how-frontend-and-backend-meet)
12. [Decisions we made (and rejected)](#12-decisions-we-made-and-rejected)
13. [Security — what is real vs what is still learning-mode](#13-security--what-is-real-vs-what-is-still-learning-mode)
14. [How to keep learning from this repo](#14-how-to-keep-learning-from-this-repo)
15. [Glossary](#15-glossary)

---

## 1. What we built and why it exists

**DevHub** is a Reddit-style discussion app:

- Users create accounts and log in
- Communities exist (like subreddits)
- Users write posts, vote, and leave threaded comments
- Notifications exist in the data model (live push comes later)

It is also a **learning artifact**. The code is written so you can see *why*
choices were made, not just *what* was typed.

### The finished picture (today)

```
┌─────────────────────┐     JSON over HTTP      ┌─────────────────────┐
│  Browser            │ ──────────────────────► │  FastAPI            │
│  React + TypeScript │ ◄────────────────────── │  (Python)           │
│  Vite on :5173      │                         │  uvicorn on :8000   │
└─────────────────────┘                         └──────────┬──────────┘
                                                           │
                                                           ▼
                                                ┌─────────────────────┐
                                                │  PostgreSQL         │
                                                │  (Docker, host:5433)│
                                                └─────────────────────┘
```

The frontend never talks to the database. That boundary is intentional:

- The browser is under the *user’s* control (they can edit your JS).
- Only the API can enforce “you must be logged in to vote.”
- A mobile app could reuse the same API later.

---

## 2. The three phases — the story in order

| Phase | What we did | Why that order |
| --- | --- | --- |
| **1 — Frontend** | Built the full UI against a *fake* API (`mocks/`) | You can design screens and flows without waiting on a database |
| **2 — Backend** | Built FastAPI + Postgres with the *same* JSON shapes | You can test the API with `/docs` and curl before wiring UI |
| **3 — Integration** | Pointed the fake API functions at real HTTP | Almost no page rewrites — the “seam” paid off |

Phases 1–5 are in place locally (including Docker Compose). GCP `terraform apply`
is optional and costs money — see [`phase-5-cloud.md`](phase-5-cloud.md).
covers what exists today: **Phases 1–3**.

### The “seam” idea (remember this)

In Phase 1 we wrote functions like:

```ts
fetchFeed(sort)
votePost(id, value)
loginRequest(username, password)
```

Pages and hooks call **those names**, not “Axios” and not “fake arrays.”

In Phase 3 we kept the **same names** and changed only the **bodies** to call
the real server. That is why Phase 3 felt small: the hard architectural work
was inventing a stable boundary early.

---

## 3. How a web app actually works

If you only remember one diagram, remember this:

```
YOU type / click
      │
      ▼
React updates the screen (UI)
      │
      │  when it needs real data…
      ▼
HTTP request  →  FastAPI  →  PostgreSQL
      │
      ▼
JSON comes back
      │
      ▼
React Query caches it
      │
      ▼
Components re-render with new data
```

### Three kinds of “state” (frontend)

Beginners put everything in `useState` and drown. There are three homes:

| Kind | Example | Where it lives |
| --- | --- | --- |
| **Server state** | posts, comments, “am I a member?” | React Query |
| **URL state** | `/?sort=top` | React Router (the address bar) |
| **Local UI state** | “is the reply box open?” | `useState` in one component |

**Rule of thumb:**

- If another computer owns the truth → React Query  
- If the back button / shareable link should remember it → URL  
- If it is just one widget’s temporary mood → `useState`

### Request / response in plain English

When the home page loads posts, the browser sends something like:

```http
GET /api/posts?sort=hot
Authorization: Bearer <token-if-logged-in>
```

The server answers with JSON (JavaScript Object Notation) — text that looks like
JavaScript objects:

```json
[
  {
    "id": "…",
    "title": "We cut our Cloud Run cold starts…",
    "score": 1284,
    "viewerVote": 0
  }
]
```

React turns that data into the cards you see.

---

## 4. How to run everything locally

You need **three** processes.

### Prerequisites

- **Node 22+** (for the frontend)
- **Docker** (for Postgres)
- **Poetry** (for the Python backend)
- Python 3.12+ recommended

### Terminal 1 — database

From the repo root:

```bash
docker compose up -d postgres
```

> **Port note:** DevHub maps Postgres to host port **5433** (not 5432), so it
> does not fight another Postgres already on your machine. The connection string
> in `backend/.env` uses `5433`.

### Terminal 2 — API

```bash
cd backend
poetry install          # first time only
poetry run alembic upgrade head
poetry run python -m scripts.seed   # first time / after reset
poetry run uvicorn app.main:app --reload --port 8000
```

Open http://127.0.0.1:8000/docs — interactive API docs. You can try endpoints
without writing curl.

### Terminal 3 — frontend

```bash
cd frontend
npm install             # first time only
npm run dev
```

Open http://127.0.0.1:5173

**Seed login:** `maya_builds` / `password123`  
(Other seeded users also work with that password.)

### If something fails

| Symptom | Likely cause |
| --- | --- |
| Feed empty / network error | Backend not on `:8000` |
| Login always fails | DB not seeded, or wrong password |
| Browser 404 on `/api/...` | Vite not running (proxy missing) |
| Join / vote returns 401 | Not logged in |

---

## 5. React from zero (ideas that matter)

You do **not** need every React feature. You need these ideas.

### 5.1 What problem React solves

Old style: poke the DOM by hand.

```js
document.getElementById('score').textContent = '943'
```

That falls apart when the same score appears in two places, or a list grows, or
you have loading / error / empty states.

React’s idea:

> **Describe what the screen should look like for the current data.  
> React updates the real page to match.**

You do not say “find the score and change it.”  
You say “the score on screen *is* `post.score`.” When `post.score` changes,
React redraws that part.

### 5.2 Components

A **component** is a function whose name starts with a capital letter and that
returns UI:

```tsx
function Greeting() {
  return <h1>Hello</h1>
}

// Use it like a custom HTML tag:
<Greeting />
```

Bigger components use smaller ones (composition). In DevHub, `PostCard` uses
`Avatar`, `VoteControl`, and `Card`.

### 5.3 JSX

JSX looks like HTML inside JavaScript. It is not a string; Vite turns it into
normal JS.

Rules you will hit constantly:

1. Return **one** parent (or a fragment `<>...</>`).
2. `{...}` runs JavaScript inside JSX: `Hello, {name}`.
3. Use `className`, not `class` (`class` is reserved in JS).
4. Self-close empty tags: `<Avatar />`.

### 5.4 Props (data going *in*)

Props are inputs — like function arguments, written as attributes:

```tsx
function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>
}

<Greeting name="Maya" />
```

Props flow **down** only. A child reads them; it does not rewrite the parent’s
copy.

Real DevHub example — `PostCard` receives a full `post` object and draws it.
It does not fetch the post itself in that design. “Get data” and “draw data”
stay separate.

### 5.5 State (data the component owns)

```tsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  )
}
```

- `count` — current value  
- `setCount` — **only** allowed way to change it  

If you write `count = count + 1`, React does not notice. The screen stays stale.

Real DevHub example — reply box in `CommentItem.tsx`:

```tsx
const [isReplying, setIsReplying] = useState(false)

// Click Reply → setIsReplying(true) → form appears
{isReplying && <CommentForm ... />}
```

### 5.6 Re-render (the confusing word)

**Re-render** means: React calls your component function again, gets a new UI
description, updates the real page.

It does **not** mean a full browser refresh (F5).

### 5.7 Hooks

Functions starting with `use` are hooks:

- `useState` — remember a value  
- `useQuery` — fetch/cache server data  
- `useAuth` — our helper for “who is logged in?”  
- `useParams` — read `:postId` from the URL  

**Two rules (broken hooks cause weird bugs):**

1. Call hooks only at the **top** of a component — not inside `if` / loops.  
2. Call hooks only from components or other hooks.

React tracks hooks by call order. Skipping one sometimes scrambles state.

### 5.8 TypeScript in one minute

TypeScript is JavaScript plus types. An interface describes a shape:

```ts
interface User {
  id: string
  username: string
  displayName: string
}
```

If you write `user.usrname`, the editor / build fails *before* runtime. That is
why `frontend/src/types/index.ts` is the single source of truth for data shapes.

---

## 6. Frontend tour — folders and responsibilities

```
frontend/src/
├── types/          Data shapes (User, Post, Comment, …)
├── mocks/          API seam (function names UI calls)
├── lib/            Helpers that don’t need React
├── hooks/          Reusable logic (vote, comments, auth read)
├── context/        AuthProvider — “who is logged in?”
├── components/     UI pieces grouped by feature
│   ├── ui/         Button, Card, Avatar, Skeleton…
│   ├── layout/     Header, Sidebar, AppLayout
│   ├── post/       PostCard, PostList, VoteControl, SortTabs
│   ├── comment/    CommentThread, CommentItem, CommentForm
│   └── routing/    ProtectedRoute
├── pages/          One component per URL
├── App.tsx         URL → page map
└── main.tsx        Boot: providers + mount React
```

**Organising principle:** group by *role*, not by file type.  
`components/comment/` tells you where discussion lives. A dump of 40 unrelated
files in `components/` does not.

---

## 7. Frontend walkthroughs — real clicks, real code

### 7.1 Boot sequence — what happens when you open the site

Start at `frontend/src/main.tsx`.

```tsx
createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
)
```

**Provider order matters.** A provider only works for components *below* it:

```
QueryClientProvider   → everything can use useQuery
  AuthProvider        → everything can use useAuth
    BrowserRouter     → everything can use Link / useParams
      App             → route table
```

If you put `BrowserRouter` *below* a component that calls `useNavigate`, you get
a confusing error. Nesting = dependency graph.

**StrictMode** (dev only) deliberately double-runs some things to catch unsafe
effects. Seeing an effect run twice in development is often StrictMode, not a
mysterious bug.

Then `App.tsx` maps URLs to pages. Layout routes wrap many pages so the header
survives navigation:

```tsx
<Route element={<AppLayout />}>
  <Route index element={<HomePage />} />
  <Route path="posts/:postId" element={<PostDetailPage />} />
  <Route element={<ProtectedRoute />}>
    <Route path="submit" element={<SubmitPage />} />
  </Route>
</Route>
```

`ProtectedRoute` is a **UX guard** (redirect to login). Real security is on the
API — anyone can still call endpoints with curl.

---

### 7.2 Loading the home feed

File: `frontend/src/pages/HomePage.tsx`

```tsx
export function HomePage() {
  const sort = useFeedSort()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.feed(sort),
    queryFn: () => fetchFeed(sort),
  })

  return (
    <div>
      <SortTabs />
      <PostList
        posts={data}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        ...
      />
    </div>
  )
}
```

Step by step:

1. `useFeedSort()` reads `?sort=` from the URL (`hot` / `new` / `top`).
2. `useQuery` asks React Query for data under a **query key**.
3. If the cache is fresh → render immediately, no network.
4. Otherwise → call `fetchFeed(sort)` (which hits FastAPI via Axios).
5. `PostList` shows one of four states: skeleton / error / empty / posts.

**Why the sort is in the query key:**

```tsx
queryKey: queryKeys.feed(sort)  // e.g. ['posts', 'feed', 'top']
```

Each ordering gets its own cache entry. Switch Hot → Top → Hot and the second
visit to Hot is instant. A bare `['feed']` key would mix them up.

Notice how thin the page is. Fetching, list states, and sorting live elsewhere.
Pages that also fetch, format, and render every detail grow past 300 lines and
become hard to change safely.

---

### 7.3 Logging in (frontend side)

Files:

- `pages/LoginPage.tsx` — form UI  
- `context/AuthProvider.tsx` — session logic  
- `lib/apiClient.ts` — Axios + Bearer header  
- `mocks/api.ts` — `loginRequest` → `POST /api/auth/login`

Flow:

```
User submits username + password
        │
        ▼
AuthProvider.login()
        │
        ▼
loginRequest()  →  POST /api/auth/login
        │
        ▼
{ accessToken, user }
        │
        ├── setAccessToken(token)     // memory — Axios interceptor uses this
        ├── sessionStorage.setItem…   // survives page refresh
        └── setUser(user)             // header shows logged-in UI
                │
                └── invalidateQueries()  // refresh viewerVote / isMember
```

On refresh:

```
AuthProvider mounts
  → read token from sessionStorage
  → setAccessToken(token)
  → GET /api/auth/me
  → success: setUser(me)
  → failure: clear token (quiet logout)
```

While that restore runs, `isBootstrapping` is true and you briefly see
“Loading session…” — so pages do not flash “logged out” then “logged in.”

**Axios interceptor** (why you never manually attach the header in every call):

```ts
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})
```

Every `apiClient.get/post` automatically includes the token when one exists.

---

### 7.4 Voting — optimistic updates explained slowly

File: `frontend/src/hooks/usePostVote.ts`

**Naive approach:** click → wait for network → update UI.  
Feels sluggish (100–300ms+), especially on mobile.

**Optimistic approach:** update UI *immediately*, then reconcile with the server.

Votes are a good fit: they almost always succeed, and being briefly wrong costs
little.

#### The score math (people get this wrong)

```ts
const nextVote = post.viewerVote === value ? 0 : value
score: post.score + (nextVote - post.viewerVote)
```

| Previous | Click | Next | Score change |
| --- | --- | --- | --- |
| 0 | upvote (+1) | +1 | +1 |
| +1 | upvote again | 0 (clear) | −1 |
| −1 | upvote | +1 | **+2** |

That last row is why you must not hardcode `score += 1`.

#### The mutation lifecycle

```
onMutate
  1. cancelQueries(['posts'])     ← stop in-flight refetches
  2. snapshot cache               ← so we can undo
  3. setQueriesData(…)            ← UI updates NOW

network request → POST /api/posts/{id}/vote

onError
  restore snapshot                ← undo if server said no

onSettled (success OR failure)
  invalidateQueries(['posts'])    ← refetch authoritative score
```

**Why cancel first?** Without it, a background refetch that started *before*
your click can finish *after* your optimistic write and overwrite the UI with
pre-vote data — the score jumps backwards. Cancelling kills that race.

**Why patch both list and detail caches?** The same post lives as one item in a
`Post[]` feed *and* as a single `Post` on the detail page. Update only one and
the scores disagree when you navigate.

Comments are **not** optimistic on create: the server assigns id + timestamp and
may reject content. Showing a comment that then vanishes is worse than waiting
~300ms.

---

### 7.5 Comments — nested trees on the frontend

Database / API return a **tree**:

```json
[
  {
    "id": "cm1",
    "body": "…",
    "replies": [
      { "id": "cm2", "body": "…", "replies": [] }
    ]
  }
]
```

`CommentThread` maps top-level comments.  
`CommentItem` renders one comment and, recursively, its `replies`.

That recursion is why one component can render a thread of any depth without
knowing the depth in advance.

---

## 8. Python + FastAPI from zero

If React felt like “UI as a function of data,” FastAPI feels like “URLs as
functions that return data.”

### 8.1 Python basics you need here

**Functions and types:**

```python
def greet(name: str) -> str:
    return f"Hello, {name}"
```

`name: str` and `-> str` are type hints. They help editors and tools; Python
does not enforce them at runtime the same way TypeScript does at compile time.

**Async / await:**

```python
async def list_posts(...):
    result = await db.execute(...)
```

`async` means “this function can pause while waiting on the database / network
without blocking the whole server.” `await` is the pause point.

You do **not** need to master concurrency theory. Read `async def` routes as:
“this handler may talk to Postgres and will wait for the answer.”

**Dictionaries and objects:**

```python
user = {"username": "maya_builds", "karma": 12840}
# vs SQLAlchemy model instances with attributes:
user.username
user.karma
```

### 8.2 What FastAPI is

FastAPI is a Python framework for building HTTP APIs.

You write:

```python
@router.get("/posts")
async def list_posts(...):
    return [...]
```

FastAPI turns that into:

- an HTTP endpoint  
- automatic validation of inputs (via Pydantic)  
- JSON responses  
- interactive docs at `/docs`

**Uvicorn** is the server process that *runs* the FastAPI app:

```bash
poetry run uvicorn app.main:app --reload --port 8000
```

`app.main:app` means: module `app.main`, variable named `app`.

### 8.3 Models vs schemas (the most important backend habit)

| Layer | Job | Example |
| --- | --- | --- |
| **Model** (SQLAlchemy) | How data is *stored* in Postgres | `User.password_hash` column |
| **Schema** (Pydantic) | How data looks on the *wire* (JSON) | `UserPublic` — no password |
| **Route** | What a URL *does* | `POST /api/auth/login` |

Never return ORM rows straight to the client. You would leak `password_hash`.
We always convert through serializers / public schemas.

### 8.4 Dependencies (`Depends`)

FastAPI can inject common needs into handlers:

```python
async def list_posts(
    db: DbSession,          # opens a DB session for this request
    viewer: OptionalUser,   # logged-in user or None
):
    ...
```

You declare what you need; FastAPI calls `get_db` / `get_current_user_optional`
for you. That keeps routes short and consistent.

---

## 9. Backend tour — folders and responsibilities

```
backend/
├── app/
│   ├── main.py           Create FastAPI app, CORS, /health
│   ├── core/
│   │   ├── config.py     Reads .env (DB URL, JWT secret)
│   │   └── security.py   bcrypt + JWT create/decode
│   ├── db/
│   │   ├── session.py    Async engine + get_db
│   │   └── base.py       SQLAlchemy Base
│   ├── models/           Tables (User, Post, Comment, …)
│   ├── schemas/          Request/response JSON shapes
│   ├── api/
│   │   ├── deps.py       get_db, get_current_user
│   │   ├── serializers.py ORM → camelCase JSON helpers
│   │   ├── router.py     Mounts all route modules under /api
│   │   └── routes/       auth, posts, comments, …
│   └── …
├── alembic/              Migrations (versioned schema changes)
└── scripts/seed.py       Sample users/posts for local dev
```

### Data model (mental picture)

```
users ──< posts >── communities
  │        │
  │        └──< comments ──┐
  │                 ▲      │  parent_id → another comment (or NULL)
  └──< votes
```

- **UUIDs** for IDs (not 1, 2, 3…) — do not leak volume; easier to generate
  safely.
- **`score` and `comment_count`** stored on the post (denormalised) so the feed
  does not `COUNT(*)` a huge votes table every time.
- **`viewerVote` / `isMember`** depend on *who is asking* — computed per request,
  not stored as universal truth on the post row.

---

## 10. Backend walkthroughs — login, feed, votes, comments

### 10.1 App entry — `app/main.py`

```python
def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, docs_url="/docs", ...)
    app.add_middleware(CORSMiddleware, ...)
    app.include_router(api_router)
    ...
    return app

app = create_app()
```

CORS middleware allows a browser on another origin to call the API. In local
dev we mostly avoid CORS pain with the Vite proxy (section 11), but CORS is
still configured for direct API access.

---

### 10.2 Login — `app/api/routes/auth.py`

Request:

```http
POST /api/auth/login
Content-Type: application/json

{"username": "maya_builds", "password": "password123"}
```

What the code does:

1. Look up the user by username.
2. `verify_password` (bcrypt) compares plain password to `password_hash`.
3. Failures use the **same** message: `"Incorrect username or password."`  
   Saying “user not found” would help attackers enumerate accounts.
4. On success: `create_access_token(str(user.id))` — JWT with `sub` = user id.
5. Return `{ accessToken, tokenType, user }` (camelCase via schema aliases).

Password hashing lives in `app/core/security.py`:

```python
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
```

**Never hash in the browser** for “security.” If the hash is what you send, the
hash *is* the password.

JWT decode + user load for protected routes: `app/api/deps.py`.

- `OptionalUser` — missing/invalid token → `None` (anonymous reads OK).  
- `CurrentUser` — missing token → HTTP 401 (writes require auth).

---

### 10.3 Home feed — `app/api/routes/posts.py`

```http
GET /api/posts?sort=hot
```

Pipeline:

1. Match `list_posts`.
2. Inject DB session + optional viewer.
3. Query posts with `selectinload(Post.author)` and `selectinload(Post.community)`  
   so author/community come in bulk — **avoids N+1** (one query per post for
   names).
4. Sort in Python:
   - `new` — newest `created_at`
   - `top` — highest `score`
   - `hot` — `score / (age_hours + 2) ** 1.5`
5. If logged in, attach each post’s `viewerVote` and community `isMember`.
6. Serialize to `PostOut` JSON matching the frontend `Post` type.

Example response fragment:

```json
{
  "id": "…",
  "title": "We cut our Cloud Run cold starts…",
  "author": {
    "username": "maya_builds",
    "displayName": "Maya Chen",
    "karma": 12840
  },
  "community": { "slug": "cloud", "isMember": false },
  "score": 1284,
  "commentCount": 6,
  "viewerVote": 0
}
```

Python stores `display_name` / `comment_count`. Pydantic’s alias generator
exposes camelCase so the React app does not need a translation layer.

---

### 10.4 Voting on the server

Same toggle math as the frontend. Votes live in `post_votes`. Clearing a vote
**deletes the row** rather than storing `0` — absence means “no vote.”

`posts.score` updates in the **same transaction** as the vote write so the
denormalised aggregate stays consistent.

---

### 10.5 Nested comments

One table, self-FK:

```
comments
  id
  post_id
  parent_id   ← NULL = top-level; otherwise another comment’s id
  body
  ...
```

API loads all comments for a post, then `build_comment_tree()` nests them into
`replies` arrays the frontend already knows how to render.

---

### 10.6 Migrations (Alembic)

You *could* call `create_all()` once. That falls apart when production already
has data and you need to add a column safely.

Alembic stores version scripts in `alembic/versions/`:

```bash
poetry run alembic revision --autogenerate -m "add foo column"
poetry run alembic upgrade head
```

Every environment runs the same scripts → same schema. That is how real teams
ship database changes.

---

## 11. Phase 3 — how frontend and backend meet

### 11.1 The seam swap

```
Before (Phase 1):  Component → mocks/api.ts → JavaScript arrays in memory
After  (Phase 3):  Component → mocks/api.ts → Axios → Vite proxy → FastAPI → Postgres
```

Example from `mocks/api.ts`:

```ts
export async function fetchFeed(sort: FeedSort = 'hot'): Promise<Post[]> {
  const { data } = await apiClient.get<Post[]>('/posts', { params: { sort } })
  return data
}
```

`HomePage` still calls `fetchFeed`. It does not care that Postgres exists.

(`mocks/data.ts` is an obsolete stub — seed data now lives in the database via
`scripts/seed.py`.)

### 11.2 The Vite proxy (why you rarely see CORS errors in dev)

`vite.config.ts` forwards:

```
Browser requests   http://127.0.0.1:5173/api/posts
Vite proxies to    http://127.0.0.1:8000/api/posts
```

The browser thinks everything is same-origin (`5173`). FastAPI still receives
the request on `8000`.

That is why `apiClient` uses `baseURL: '/api'` — **never** hardcode
`http://localhost:8000` in frontend code. Relative `/api` works in dev (proxy)
and can work in production behind the same host/path design later.

### 11.3 Full path of one upvote (both sides)

```
1. User clicks upvote in VoteControl
2. usePostVote.onMutate updates React Query cache (instant UI)
3. votePost(id, 1) in mocks/api.ts
4. apiClient.post(`/posts/${id}/vote`, { value: 1 })
   + Authorization: Bearer <token>
5. Browser → :5173/api/... → Vite proxy → :8000/api/...
6. FastAPI deps load CurrentUser from JWT
7. Server toggles vote row, updates score, returns updated post JSON
8. onSettled invalidates ['posts'] → refetch authoritative numbers
```

If the token is missing, step 6 returns 401; `onError` restores the snapshot.

---

## 12. Decisions we made (and rejected)

**Vite, not Next.js.**  
The stack calls for React Router + Axios + React Query. Next.js brings its own
router and data model, which would fight those libraries. Vite keeps frontend
and backend as separate tiers — the boundary this project exists to teach.

**Server state is not component state.**  
Anything owned by the backend lives in React Query. Reimplementing cache /
dedupe / revalidate with `useEffect` + `useState` in every page is how fetch
bugs breed.

**Optimistic updates only where honest.**  
Votes: yes. Creating comments: no (server owns id/timestamp; may reject).

**Models ≠ schemas.**  
ORM tables can hold secrets. Public JSON must not. Separate layers make leaks
harder.

**Vague auth errors.**  
Same message for bad user and bad password — reduces account enumeration.

**UUID primary keys.**  
Sequential IDs leak scale and make client-side / multi-region ID generation
awkward.

**Denormalised `score` / `comment_count`.**  
Read-heavy feeds should not recount votes on every request. Writes update
aggregates in the same transaction.

---

## 13. Security — what is real vs what is still learning-mode

| Already real | Still learning / later |
| --- | --- |
| Passwords hashed with bcrypt server-side | HttpOnly refresh cookies |
| JWT checked on write endpoints | Shorter access-token TTL + rotation |
| Public user JSON omits password hash | Redis rate limiting on login |
| Server-side validation (Pydantic) | Secret Manager in cloud |
| `ProtectedRoute` is UX only | Real enforcement is always API |

**Honest note on `sessionStorage`:** XSS can still read it. It is a pragmatic
dev compromise so refresh restores the session. Production direction: short-lived
access token in memory + refresh token in an HttpOnly, Secure, SameSite cookie.

**Frontend validation is convenience.** Every rule must be duplicated on the
backend. Users can bypass your UI with curl.

---

## 14. How to keep learning from this repo

### Suggested reading order (files)

1. `frontend/src/types/index.ts` — shapes of everything  
2. `frontend/src/main.tsx` + `App.tsx` — boot and routes  
3. `frontend/src/pages/HomePage.tsx` — React Query in the wild  
4. `frontend/src/hooks/usePostVote.ts` — optimistic updates  
5. `frontend/src/context/AuthProvider.tsx` — session  
6. `frontend/src/mocks/api.ts` — the seam  
7. `backend/app/main.py` — API entry  
8. `backend/app/api/routes/auth.py` — login/register  
9. `backend/app/api/routes/posts.py` — feed + vote  
10. `backend/app/api/deps.py` — how “current user” is injected  

### Tiny experiments (safe)

1. In `CommentItem`, temporarily set `useState(true)` for `isReplying` — every
   reply box opens. Change it back. That is state.
2. Log in, open React Query Devtools (floating icon in dev), watch the `posts`
   queries when you change sort and when you vote.
3. Hit http://127.0.0.1:8000/docs, authorize with a token from login, create a
   post from the docs UI, watch it appear in the React feed after refresh /
   invalidate.

### What Phase 4 added

Redis for caching the hot feed, rate-limiting auth, and pub/sub for live
notifications over WebSockets. Viewer-relative fields like `isMember` must never
sit alone in a *shared* cache key — that would leak one user’s state to another.
See [`phase-4-redis.md`](phase-4-redis.md).

---

## 15. Glossary

| Term | Plain meaning |
| --- | --- |
| **SPA** | Single-page application: one HTML shell; JS swaps content as you navigate |
| **Component** | A function that returns a piece of UI |
| **Props** | Inputs passed into a component from its parent |
| **State** | Data a component remembers; changing it re-renders |
| **Hook** | A `use…` function that taps into React features |
| **JSX** | HTML-like syntax inside JavaScript |
| **React Query** | Library that fetches, caches, and refreshes server data |
| **Query key** | Cache address for a piece of server data |
| **Mutation** | A write (vote, create post) as opposed to a read query |
| **Optimistic update** | Update UI before the server confirms; roll back on failure |
| **Context** | React way to share values (like auth) without prop drilling |
| **Prop drilling** | Passing props through many layers that do not use them |
| **Axios** | HTTP client (cleaner than raw `fetch` for our needs) |
| **Interceptor** | Axios hook that runs on every request/response |
| **JWT** | JSON Web Token — signed string proving “this user logged in” |
| **Bearer token** | Sending JWT as `Authorization: Bearer …` |
| **bcrypt** | Password hashing algorithm (slow on purpose — good for passwords) |
| **ORM** | Object-Relational Mapper — Python classes ↔ database tables |
| **SQLAlchemy** | The ORM we use |
| **Pydantic** | Validates and shapes request/response data |
| **Alembic** | Database migration tool |
| **N+1 problem** | Fetching a list, then one query per item for related data |
| **selectinload** | SQLAlchemy strategy to load relations in bulk |
| **CORS** | Browser rule about calling APIs on other origins |
| **Proxy (Vite)** | Dev server forwards `/api` to the backend so the browser stays same-origin |
| **Denormalisation** | Storing computed values (like `score`) for faster reads |
| **UUID** | Universal unique id string, not a sequential integer |
| **Dependency injection** | Framework supplies `db` / `user` into your route for you |
| **Seam** | Stable boundary (`mocks/api.ts`) so internals can change without rewriting callers |

---

## Closing

DevHub is three ideas repeated carefully:

1. **Separate tiers** — browser UI, API rules, database truth.  
2. **Stable contracts** — TypeScript types and Pydantic schemas agree on JSON.  
3. **Put state in the right home** — React Query / URL / `useState`.

If you can follow one feed load and one vote from click → Axios → FastAPI →
Postgres → JSON → cache → screen, you understand the system. Everything else is
more of the same pattern applied to comments, communities, and auth.

When you get stuck, start from the symptom:

- UI wrong but network fine → React / React Query / cache  
- Network 401/403 → token / `deps.py`  
- Network 500 → server logs / route handler / DB  
- Empty data → seed script / wrong sort / backend down  

You do not need to memorise this file. You need the *ideas* so you can rebuild —
or build something different — from principles rather than by copying.
