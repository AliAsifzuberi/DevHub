# DevHub architecture

This document explains how DevHub is put together and, more usefully, *why*.
It is written to be read in order, but each section stands alone.

---

## 1. The three-tier model

```
┌─────────────────────────────────────────────┐
│  Presentation — React SPA in the browser    │
│  Renders UI, holds client state, calls API  │
└──────────────────┬──────────────────────────┘
                   │  JSON over HTTPS
┌──────────────────▼──────────────────────────┐
│  Application — FastAPI                      │
│  Business rules, authn/authz, validation    │
└────────┬────────────────────────┬───────────┘
         │                        │
┌────────▼─────────┐   ┌──────────▼──────────┐
│  PostgreSQL      │   │  Redis              │
│  Source of truth │   │  Cache, sessions,   │
│  Relational data │   │  rate limits, pub/sub│
└──────────────────┘   └─────────────────────┘
```

### Why separate the tiers at all?

A single process serving HTML from a database would be simpler, and for a small
project it would work. The separation buys three things that matter here:

**Independent scaling.** Feed reads vastly outnumber writes. Running eight
stateless API containers against one database is cheap; running eight databases
is not.

**A real security boundary.** This is the important one. Everything in the
browser is under the user's control — they can edit the JavaScript, forge
requests, and ignore your UI entirely. The API server is the first point where
a rule can actually be *enforced* rather than merely suggested.

**Substitutability.** A mobile client can consume the same API without any
backend change, because the contract is HTTP and JSON rather than rendered HTML.

### The cost

Two tiers mean network latency between them, two deployments, and the
possibility of them disagreeing about the shape of the data. The last risk is
mitigated by defining the domain model once (`frontend/src/types/index.ts`) and
mirroring it in the backend's Pydantic schemas.

---

## 2. Data model

Five core entities. IDs are UUIDs, not sequential integers — sequential IDs leak
volume information (`/posts/1042` tells a competitor roughly how many posts
exist) and make sharding or client-side generation impossible.

```
users ──< posts >── communities
  │        │
  │        └──< comments ──┐
  │                 ▲      │  self-reference:
  └──< votes        └──────┘  comments.parent_id → comments.id
```

| Relationship | Type | Implementation |
| --- | --- | --- |
| user → posts | one-to-many | `posts.author_id` FK |
| community → posts | one-to-many | `posts.community_id` FK |
| post → comments | one-to-many | `comments.post_id` FK |
| comment → replies | recursive | `comments.parent_id` FK, nullable |
| user ↔ post votes | many-to-many | `votes` join table with a value column |

### The recursive relationship

Threaded discussion comes from one nullable column. `comments.parent_id` points
at another row in the same table; `NULL` means top-level. That single column
turns a flat table into a tree of unbounded depth.

Reading it back efficiently is the interesting part, and it is a Phase 2
problem: fetching a deep thread naively means one query per level. PostgreSQL's
recursive CTE (`WITH RECURSIVE`) retrieves the whole tree in a single query,
which the API then nests into the `Comment.replies` structure the frontend
expects.

### Denormalised aggregates

`posts.score` and `posts.comment_count` are stored, not computed on read.
Counting votes across a million-row table on every feed render would dominate
the query cost. The trade-off is that these columns can drift from the truth if
a write path forgets to update them, so they are maintained in the same
transaction as the vote or comment insert — and a periodic reconciliation job
is the standard safety net.

### Viewer-relative fields

`Post.viewerVote` and `Community.isMember` depend on *who is asking*. Everything
else about a post is the same for everyone.

This distinction has a direct consequence for Phase 4: viewer-relative fields
must never be written into a shared cache key. Caching one user's `isMember:
true` and serving it to another is a data leak. The pattern is to cache the
shared portion of a response and merge per-viewer state in afterwards.

---

## 3. Data flow

### Reading the feed

```
User opens /
  → HomePage reads sort from the URL (?sort=top)
  → useQuery(['posts','feed','top'])
      → cache hit and fresh?  render immediately, no request
      → otherwise            call the API
  → PostList renders one of: skeleton / error / empty / posts
```

React Query is doing real work here. The query key encodes the sort, so each
ordering caches separately and switching back is instant. Two components
mounting the same key share one request rather than firing two.

### Casting a vote

```
Click upvote
  → onMutate:  cancel in-flight 'posts' queries   ← prevents a race
               snapshot every matching cache entry
               apply the change locally            ← UI updates now
  → request goes out
  → success:   nothing to do visually
  → failure:   restore the snapshot                ← the undo path
  → settled:   invalidate, refetch authoritative score
```

The cancellation step is the subtle one. Without it, a background refetch that
was already in flight can resolve *after* the optimistic write and overwrite it
with pre-vote data, making the score visibly jump backwards.

### Posting a comment

Deliberately *not* optimistic. The server assigns the ID and canonical
timestamp, and may reject the content. Rendering a comment that then vanishes is
worse than a 300ms wait. On success, two caches are invalidated: the comment
list and the post itself, because the post carries `commentCount`.

---

## 4. Frontend state

Three kinds of state, three different tools. Conflating them is the most common
source of frontend complexity.

| Kind | Example | Where it lives | Why |
| --- | --- | --- | --- |
| Server | posts, comments, communities | React Query | Owned remotely; needs caching, deduplication, revalidation |
| URL | current sort, current route | React Router | Should be shareable, bookmarkable, and survive refresh |
| Local UI | dropdown open, reply box visible | `useState` | Ephemeral, belongs to one component, meaningless elsewhere |

The rule of thumb for the middle row: if it describes *what the user is looking
at*, it belongs in the URL. If it describes *how a widget is behaving right
now*, it belongs in component state.

---

## 5. Security posture

### What Phase 1 does

Escapes all user content by rendering it as text. React escapes interpolated
strings automatically, so a comment containing `<script>` is displayed rather
than executed. `dangerouslySetInnerHTML` appears nowhere in the codebase; if
Markdown support is added, it must be sanitised server-side first.

Validates URL parameters before use — `?sort=banana` falls back to the default
rather than being passed through to the API.

### What Phase 1 explicitly does not do

`ProtectedRoute` is a **user experience** control, not a security boundary. It
runs in the browser, where the user can trivially bypass it. Real authorisation
must be a FastAPI dependency that rejects the request before any handler runs.

The login form accepts any password. There is no data to protect yet, and the
component contract — loading, error, nullable user — is what Phase 1 is
establishing.

### Phase 2 and 3 obligations

- Argon2 or bcrypt hashing, server-side only. Hashing in the browser makes the
  hash itself the password, replayable by anyone who intercepts it.
- Access tokens in memory, short-lived. Not `localStorage`, which any injected
  script can read.
- Refresh tokens in `HttpOnly; Secure; SameSite=Lax` cookies — unreadable by
  JavaScript by design.
- Login responses that do not reveal whether a username exists. "No such user"
  versus "wrong password" is a free account-enumeration oracle.
- Every client validation rule duplicated server-side.
- Redis-backed rate limiting on authentication endpoints.
- Parameterised queries throughout. An ORM gives this by default; the moment
  someone reaches for raw SQL string formatting, it is lost.

---

## 6. Performance and caching plan

### Already addressed

The API returns posts with `author` and `community` expanded rather than as
bare foreign keys. Rendering a 25-post feed from IDs alone would require 50
follow-up requests — the N+1 problem, designed out rather than discovered under
load.

`staleTime` of 30 seconds means navigating into a post and pressing Back reuses
the cached feed instead of refetching it.

### Phase 4: what Redis is for

| Use | Problem it solves |
| --- | --- |
| Feed cache | Hot ranking sorts every post on every request. Cache the computed ordering for ~60s. |
| Rate limiting | Counters with TTLs, atomic and shared across all instances. |
| Sessions | Ephemeral state that must not occupy a database connection. |
| Pub/Sub | Notification fan-out across instances. |

The pub/sub case deserves emphasis. On Cloud Run there are many container
instances. The user who should receive a notification is probably connected via
a WebSocket to a *different* instance from the one handling the request that
triggered it. Without a shared message bus the notification never arrives — and
the bug is invisible locally, where only one instance exists.

Redis is a cache, not a database. Default persistence can lose the last seconds
of writes on a crash, which is fine for a cached feed and unacceptable for a
comment.

---

## 7. Deployment plan (Phase 5)

```
Cloud Run (frontend)  ──►  Cloud Run (backend)  ──►  Cloud SQL (PostgreSQL)
                                    │
                                    ├──►  Memorystore (Redis)
                                    ├──►  Cloud Storage  (avatars, uploads)
                                    └──►  Secret Manager (credentials)
```

Cloud Run because both tiers are stateless containers that scale to zero — the
right cost profile for a project with uneven traffic. Its constraints shape the
design: no local disk state, no in-process caches shared between requests, and
cold starts that make container image size a latency concern.

Two things to get right early:

**The SPA needs a catch-all rewrite.** Whatever serves the built frontend must
return `index.html` for unknown paths. Otherwise the app works when navigating
to a post but 404s when someone refreshes on it.

**Terraform state belongs in a remote backend.** A versioned Cloud Storage
bucket, with locking. State files contain secrets in plaintext and concurrent
applies can destroy resources.

---

## 8. Known gaps

Honest inventory of what Phase 1 does not do:

- **No pagination.** The feed fetches everything. Fine for six seed posts, not
  for six thousand. Cursor-based pagination is the Phase 2 fix; offset
  pagination degrades badly and skips rows when items are inserted mid-scroll.
- **No search.** Deliberately omitted rather than shipped as a dead input.
  PostgreSQL full-text search is the likely approach.
- **No post editing or deletion**, despite being in the spec. Needs the
  ownership checks that only a backend can enforce.
- **No image uploads.** Waiting on Cloud Storage.
- **No tests.** The next thing worth adding: Vitest for the pure logic in
  `lib/format.ts` and `hooks/usePostVote.ts`, both of which have real edge cases
  (the vote-swing arithmetic in particular).
- **Comment tree renders fully.** A thread with thousands of replies will be
  slow. Virtualisation or lazy sub-thread loading solves it when it matters.
