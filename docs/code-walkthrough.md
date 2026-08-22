# DevHub code walkthrough — a guided tour for a junior developer

This document teaches you the DevHub frontend from the ground up. It assumes you
can read basic JavaScript but have not necessarily built a full React
application before. Read it top to bottom the first time; after that, use it as a
reference.

The goal is not to memorise this codebase. It is to understand the *ideas*, so
that you could rebuild it — or build something different — from principles rather
than by copying.

---

## Table of contents

1. [How to think about a frontend application](#1-how-to-think-about-a-frontend-application)
2. [The technology stack, and why each piece exists](#2-the-technology-stack-and-why-each-piece-exists)
3. [React from zero — the ideas that matter](#3-react-from-zero--the-ideas-that-matter)
4. [The three kinds of state](#4-the-three-kinds-of-state)
5. [A tour of the folders](#5-a-tour-of-the-folders)
6. [Following one click all the way through](#6-following-one-click-all-the-way-through)
7. [The hard parts, explained slowly](#7-the-hard-parts-explained-slowly)
8. [TypeScript, just enough](#8-typescript-just-enough)
9. [How the styling works](#9-how-the-styling-works)
10. [How to read this codebase on your own](#10-how-to-read-this-codebase-on-your-own)
11. [Glossary](#11-glossary)

---

## 1. How to think about a frontend application

Before any React, hold this picture in your head.

A web application has **three tiers**:

```
   YOU (the browser)                    A COMPUTER SOMEWHERE           A DATABASE
┌──────────────────────┐            ┌────────────────────────┐    ┌──────────────┐
│  The frontend         │  asks →    │  The backend           │ →  │  PostgreSQL  │
│  React, runs on YOUR  │            │  FastAPI, runs on a    │    │  stores the  │
│  laptop/phone         │  ← answers │  server we control     │ ←  │  real data   │
└──────────────────────┘            └────────────────────────┘    └──────────────┘
```

The **frontend** is everything the user sees and touches. It runs *on the user's
device*, inside their browser. This is the part we built in Phase 1.

The crucial consequence of "runs on the user's device": **you cannot trust it.**
The user can open developer tools, change your code, and send whatever they like
to the backend. That is why real security always lives on the backend. The
frontend's job is to be *pleasant and correct for honest users*, not to enforce
rules. Keep this in mind — it explains a lot of decisions later.

Right now DevHub has no backend yet, so the frontend talks to a **fake backend**
we wrote in `src/mocks/`. It behaves like the real thing (it is slow, it can
fail) so that when the real backend arrives, almost nothing has to change.

---

## 2. The technology stack, and why each piece exists

You will hear these names constantly. Here is what each one actually does, in
plain terms.

| Tool | One-sentence job | Why we chose it |
| --- | --- | --- |
| **React** | Turns data into what you see on screen, and keeps them in sync | The industry standard; huge ecosystem |
| **TypeScript** | JavaScript that catches typos and wrong data shapes *before* you run it | Prevents a whole category of bugs |
| **Vite** | The dev server + build tool; runs your code while you edit, bundles it for production | Fast, modern, simple |
| **React Router** | Decides which "page" to show based on the URL | The standard router for React |
| **React Query** | Manages data that comes from the server (fetching, caching, refreshing) | Removes hundreds of lines of manual fetch logic |
| **Axios** | Makes HTTP requests (the `fetch` of choice) | Cleaner API than raw `fetch`, interceptors |
| **Tailwind CSS** | Styling by putting utility classes directly on elements | Fast to write, consistent, no separate CSS files to hunt through |

### Why these and not others?

The spec asked for React Router + Axios + React Query. That combination describes
a **single-page application (SPA)**: one HTML file, and JavaScript swaps the
content as you navigate. That is why we used **Vite** and not **Next.js** —
Next.js has its own router and its own data-fetching, which would fight all three
of those libraries. Vite keeps things simple and keeps the frontend and backend
as genuinely separate tiers, which is exactly what you want to learn.

---

## 3. React from zero — the ideas that matter

This section used to be too short and too dense. Here is a slower version. Read it
once, then open one file from DevHub and try to spot each idea in the real code.

You do **not** need to understand every React feature. You need five ideas:

1. What problem React solves
2. Components (building blocks)
3. JSX (the HTML-looking syntax)
4. Props (data going *in*)
5. State (data that can change, which updates the screen)

Hooks come after that, once state is clear.

---

### 3.1 What problem is React solving?

Without React, you write HTML once, then use JavaScript to poke at it:

```js
// Old-school style — do not write this in DevHub
document.getElementById('score').textContent = '943'
document.getElementById('upvote').classList.add('active')
```

That works for a tiny page. It falls apart when:

- a score appears in **two places** and you forget to update one,
- you add a new post to a list of 20 and have to hand-build the HTML for it,
- something is loading, failed, empty, or full — and you juggle all those cases
  with `if` statements and DOM edits.

React's idea is different:

> **You describe what the screen should look like for the current data.
> React updates the real page to match.**

You do not say "find the score element and change its text."
You say "the score on screen is whatever `post.score` currently is."
When `post.score` changes, React redraws that part.

That is the whole job of React. Everything else (components, props, state) exists
to make that idea practical.

---

### 3.2 Components — Lego bricks for the UI

A **component** is a reusable piece of the UI.

Think of a webpage as Lego. Instead of one giant brick, you build:

- a button brick
- an avatar brick
- a post card brick (which uses the button and avatar bricks)
- a home page (which uses many post card bricks)

In code, a component is just a **JavaScript function** whose name starts with a
**capital letter**, and whose return value is what should appear on screen:

```tsx
function Greeting() {
  return <h1>Hello</h1>
}
```

That function is a component called `Greeting`.

You put it on the screen by writing it like a custom HTML tag:

```tsx
<Greeting />
```

When React sees `<Greeting />`, it calls the `Greeting` function and puts
whatever that function returned onto the page.

#### Components inside components

A bigger component can use smaller ones. That is how whole pages get built.

In DevHub, open `src/components/post/PostCard.tsx`. Inside one post card you will
see things like:

- `<Avatar ... />` — the coloured circle with a letter
- `<VoteControl ... />` — the up/down arrows
- `<Card ... />` — the white rounded box around everything

`PostCard` does not redraw an avatar from scratch. It says "put an Avatar here"
and lets that smaller component handle the details. That is composition: small
pieces combined into larger ones.

> **Rule of thumb:** if you can point at something on screen and give it a name
> (button, avatar, post card, header), it is probably a component.

---

### 3.3 JSX — why does this look like HTML inside JavaScript?

Look at this again:

```tsx
function Greeting() {
  return <h1>Hello</h1>
}
```

That `<h1>Hello</h1>` is **not** a string. It is **JSX**.

JSX is a special syntax that lets you write something HTML-like *inside*
JavaScript. React (with help from the build tool Vite) turns that into normal
JavaScript behind the scenes.

You can think of it as:

> "This is the shape of the UI I want."

A few rules that matter in DevHub:

**1. One parent wrapper.**
A component must return one top-level thing. If you need two siblings, wrap them
in a `<div>` or a `<>...</>` (a fragment — an invisible wrapper).

**2. Curly braces drop into JavaScript.**
Inside JSX, `{...}` means "run this JavaScript and put the result here":

```tsx
function Greeting() {
  const name = 'Maya'
  return <h1>Hello, {name}</h1>   // shows: Hello, Maya
}
```

**3. Attributes use `className`, not `class`.**
In real HTML you write `class="..."`. In JSX you write `className="..."`, because
`class` is already a reserved word in JavaScript.

**4. Self-closing tags need a slash.**
`<Avatar />` not `<Avatar>`. Same idea as `<img />` in HTML.

You do not need to memorise JSX. After a day of reading DevHub files, it becomes
familiar. Treat it as "HTML with JavaScript pockets."

---

### 3.4 Props — handing information into a component

So far `Greeting` always says "Hello". That is useless. We need to pass it a name.

**Props** (short for properties) are the inputs to a component. They work like
function arguments, but you pass them the way you pass HTML attributes:

```tsx
// 1. The component RECEIVES props
function Greeting(props) {
  return <h1>Hello, {props.name}</h1>
}

// 2. The parent PASSES props
<Greeting name="Maya" />
```

What React does:

1. Sees `<Greeting name="Maya" />`
2. Calls `Greeting({ name: 'Maya' })`  ← props is just an object
3. Puts `Hello, Maya` on the screen

People almost always **destructure** props so they do not write `props.` over and
over:

```tsx
function Greeting({ name }) {
  return <h1>Hello, {name}</h1>
}
```

Same thing. `{ name }` means "pull `name` out of the props object."

#### Important: props flow one way — down

The parent decides what to pass. The child **reads** props. The child does not
change the parent's data.

```
Parent                    Child
───────                   ─────
has the post data   →     receives post as a prop
                          can DISPLAY it
                          cannot CHANGE the parent's copy
```

#### Real example from DevHub

In `PostCard.tsx` the first line looks roughly like:

```tsx
export function PostCard({ post, hideCommunity = false }) {
```

That means:

- this component expects a `post` object (title, score, author, …)
- and optionally `hideCommunity` (defaults to `false` if not passed)

Someone higher up (usually `PostList`) does:

```tsx
<PostCard post={somePost} />
```

`PostCard` does not fetch the post itself in this design. It is handed a post and
asked to display it. That keeps "get the data" separate from "draw the data,"
which makes both easier to understand.

> **Analogy:** props are like the ingredients you hand a cook. The cook (the
> component) prepares the dish. They do not invent new ingredients mid-recipe, and
> they do not rewrite your shopping list.

---

### 3.5 State — data that can change, and updates the screen

Props come from outside. **State** is data the component **owns** itself.

Classic example: a counter.

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

Break that down line by line — this is the most important snippet in this whole
section.

#### What `useState(0)` does

```tsx
const [count, setCount] = useState(0)
```

You are asking React: "Please remember a value for me. Start it at `0`."

React gives you **two things**:

| Name | What it is |
| --- | --- |
| `count` | the current value (right now: `0`) |
| `setCount` | the only allowed way to change that value |

The `[count, setCount]` syntax is array destructuring. `useState` always returns
a pair: `[currentValue, setterFunction]`. You can name them whatever you like;
`count` / `setCount` is the usual pattern.

#### What happens when you click

1. User clicks the button.
2. `onClick` runs: `setCount(count + 1)`.
3. React updates the remembered value from `0` to `1`.
4. React **runs the `Counter` function again** (this is called a re-render).
5. This time `{count}` is `1`, so the button text becomes "Clicked 1 times".
6. React updates only the parts of the real page that changed.

You did not touch the DOM. You changed the data. React updated the screen.

#### Why you must not write `count = count + 1`

```tsx
count = count + 1   // ❌ React does not notice. Screen stays stale.
setCount(count + 1) // ✅ React notices. Screen updates.
```

React only re-renders when you use the setter. Direct assignment is invisible to
it.

#### Real example from DevHub: the Reply button

Open `src/components/comment/CommentItem.tsx`. Near the top:

```tsx
const [isReplying, setIsReplying] = useState(false)
```

Meaning: "Remember whether the reply box is open. Start closed (`false`)."

Later, something like:

```tsx
<button onClick={() => setIsReplying(true)}>Reply</button>

{isReplying && <CommentForm ... />}
```

Read that second line carefully:

- `isReplying && <CommentForm ... />` means:
  - if `isReplying` is true → show the form
  - if `isReplying` is false → show nothing

So the flow is:

1. Page loads → `isReplying` is `false` → no form on screen.
2. User clicks Reply → `setIsReplying(true)`.
3. React re-runs `CommentItem`.
4. Now `isReplying` is `true` → the form appears.

Same idea as the counter. Different data (a boolean instead of a number).

> **Props vs state, one more time:**
>
> - **Props** = inputs from the parent. You receive them. You do not change them.
> - **State** = the component's own memory. You change it with a setter, and the
>   screen updates.

---

### 3.6 Re-rendering — the word that confuses everyone

"Re-render" sounds fancy. It means something simple:

> React calls your component function again, gets a new description of the UI,
> and updates the real page to match.

It does **not** mean the whole website refreshes like pressing F5.
It does **not** mean every pixel is rebuilt from scratch.

Usually only the component whose state changed (and its children) re-run. That is
why React apps feel snappy.

Things that cause a re-render:

- calling a state setter (`setCount`, `setIsReplying`, …)
- the parent re-rendering and passing new props
- (later) React Query giving you new server data

You almost never need to "force" a re-render. If the screen is wrong, the data
feeding it is usually wrong — fix the data, and the UI follows.

---

### 3.7 Hooks — after you understand `useState`

You will see many functions whose names start with `use`:

- `useState` — remember a value (you just learned this)
- `useAuth` — our custom helper: "who is logged in?"
- `useQuery` — React Query: "fetch and cache server data"
- `useParams` — React Router: "what is in the URL?"

These are called **hooks**.

For now, treat a hook as:

> **A special function you call inside a component to get React-powered
> behaviour.**

`useState` is a built-in hook. We also write our own in `src/hooks/` so several
components can share the same logic without copy-paste.

Example you will see everywhere in DevHub:

```tsx
const { user, login, logout } = useAuth()
```

That does not magically create a user. It reaches into the app's auth system and
returns the current user (or `null` if logged out), plus functions to log in/out.
Any component can call `useAuth()` instead of receiving `user` as a prop from
ten layers above.

#### Two rules (memorise these; broken hooks cause weird bugs)

1. **Only call hooks at the top of a component** — not inside `if`, loops, or
   nested functions.
2. **Only call hooks from components or other hooks** — not from random helper
   functions.

Why? React tracks hooks by the *order* they run. If sometimes you call two hooks
and sometimes three (because of an `if`), React loses track and your state gets
scrambled.

You do not need to understand the internal tracking yet. Just follow the rules.

---

### 3.8 Put it together: one sentence for each idea

| Idea | One sentence |
| --- | --- |
| **Component** | A function that returns a piece of UI. |
| **JSX** | HTML-looking syntax inside JavaScript that describes that UI. |
| **Props** | Data the parent passes in; the child can read it, not rewrite it. |
| **State** | Data the component remembers; change it with a setter, screen updates. |
| **Re-render** | React runs the component function again after data changes. |
| **Hook** | A `use…` function that gives a component React-powered abilities. |

And the big picture again, now that the pieces have names:

> You write components that say: "given this props and this state, here is what
> the UI looks like." When state (or props) change, React re-runs those
> components and updates the page.

That is React. The rest of DevHub is this idea applied over and over: more
components, more props, more state, plus libraries (Router, Query) for URLs and
server data.

---

### 3.9 A tiny practice exercise (do this)

With the app running (`npm run dev` in `frontend/`):

1. Open `src/components/comment/CommentItem.tsx`.
2. Find `useState(false)` for `isReplying`.
3. Temporarily change the starting value to `useState(true)`.
4. Save. Open a post. Every comment should show a reply box already open.
5. Change it back to `false`.

If that experiment makes sense, you understand state. If it does not, re-read
section 3.5 and ask — that section is the foundation everything else sits on.

---

## 4. The three kinds of state

This is the single most useful idea for keeping a frontend clean. Beginners put
everything in `useState` and drown. There are actually three different kinds of
state, and each has its own home.

| Kind | Example in DevHub | Where it lives | File to look at |
| --- | --- | --- | --- |
| **Server state** | posts, comments, communities | React Query | `src/lib/queryClient.ts` |
| **URL state** | which sort is active (`?sort=top`) | React Router | `src/hooks/useFeedSort.ts` |
| **Local UI state** | is a dropdown open | `useState` | `src/components/layout/Header.tsx` |

### Server state — the big one

Data that lives on the server is fundamentally different from data you make up
locally. It:

- can change without you knowing (someone else votes),
- can be slow to fetch,
- can fail to fetch,
- can go stale.

If you fetch it with `useEffect` and store it in `useState`, you end up
hand-writing loading flags, error flags, caching, and refreshing — in *every*
component. **React Query** does all of that for you. You describe *how* to fetch
the data, and it manages the rest.

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['posts', 'feed', sort],
  queryFn: () => fetchFeed(sort),
})
```

`data` is the posts, `isLoading` is true while fetching, `error` is set if it
failed. You did not write any of that bookkeeping. See `src/pages/HomePage.tsx`.

### URL state — shareable and back-button-friendly

Ask yourself: *if I refresh the page, should this survive? If I send someone the
link, should they see the same thing?* If yes, it belongs in the URL, not in
`useState`. The feed sort is a perfect example — `/?sort=top` is shareable, the
back button works, and a refresh keeps your choice. See `useFeedSort.ts`.

### Local UI state — everything else

Is a menu open? Is the reply box showing? That is ephemeral, belongs to one
component, and means nothing to anyone else. Plain `useState`.

**The rule of thumb:** if state describes *what the user is looking at*, it goes
in the URL or React Query. If it describes *how one widget is behaving right
now*, it goes in `useState`.

---

## 5. A tour of the folders

```
frontend/src/
├── types/          The shapes of our data. Start here.
├── mocks/          The fake backend (data + fake API)
├── lib/            Helpers that don't know about React
├── hooks/          Reusable logic (custom hooks)
├── context/        App-wide state (who is logged in)
├── components/     Reusable UI pieces
│   ├── ui/         Generic: Button, Card, Avatar…
│   ├── layout/     The app shell: Header, Sidebar…
│   ├── post/       Post feed pieces
│   ├── comment/    Comment thread pieces
│   └── routing/    Route protection
├── pages/          One component per URL
├── App.tsx         The map of URL → page
└── main.tsx        The entry point that starts everything
```

The organising idea: **group by feature, not by file type.** All the comment code
is in `components/comment/`. When you need to fix the comment thread, you know
exactly where to look. Anything used by more than one feature (a button, a card)
moves up into `ui/`.

Let me explain each folder in the order it makes sense to learn them.

### 5.1 `types/` — the shape of everything

Open `src/types/index.ts`. This file defines what a `User`, `Post`, `Comment`,
and `Community` look like. Everything else in the app is built on these.

```ts
export interface Post {
  id: ID
  title: string
  body: string
  author: User
  community: Community
  score: number
  commentCount: number
  viewerVote: VoteValue
  // ...
}
```

An `interface` describes the shape of an object. If you try to use `post.titel`
(typo) or `post.score.toUpperCase()` (score is a number, not text), TypeScript
stops you *before you run the code*. This is why we start here: get the data shapes
right and everything downstream is easier.

Notice two teaching points baked into this file:

- `Post` has no `password` field anywhere, and neither does `User`. If a field
  does not exist in the type, it is *impossible* to accidentally show it on
  screen. Designing types to exclude private data is safer than remembering not
  to render it.
- `author` and `community` are full objects, not just IDs. That is a deliberate
  choice explained in the comments — it avoids the "N+1 problem" (having to make
  50 extra requests to look up names). More on that later.

### 5.2 `mocks/` — the pretend backend

Two files:

- `data.ts` — hardcoded posts, users, communities. The pretend database.
- `api.ts` — functions like `fetchFeed()`, `votePost()`, `createComment()`.

The important idea is the **seam**. Components never touch `data.ts` directly.
They call functions in `api.ts`, and those functions are `async` (they return
promises, i.e. they take time) and can throw errors — exactly like real network
calls.

```ts
export async function fetchFeed(sort: FeedSort = 'hot'): Promise<Post[]> {
  await latency()                      // pretend the network is slow
  return clone(sortPosts(posts, sort)) // return a copy of the data
}
```

When the real backend is built (Phase 3), we replace the *insides* of these
functions with real HTTP calls, and the rest of the app does not change. That is
the whole point of the seam: it isolates "where data comes from" to one folder.

> **Why `clone()`?** It returns a *copy* of the data. Real HTTP always gives you
> a fresh object, never a live reference to the server's memory. Copying here
> means a component that accidentally modifies the result cannot corrupt our
> pretend database — a realistic and useful discipline.

### 5.3 `lib/` — plain helpers

Code here does not know React exists. That makes it easy to test and reuse.

- `format.ts` — turns data into display strings: `formatRelativeTime()` makes
  `"5 hours ago"`, `formatCompactNumber()` makes `48210 → "48.2K"`. Also `cn()`,
  a tiny helper for combining CSS class names conditionally.
- `apiClient.ts` — the configured Axios instance for Phase 3 (not used yet, but
  it defines how we will talk to the real backend).
- `queryClient.ts` — React Query's configuration, and the list of all query
  keys.
- `buttonStyles.ts` — shared button styling, so a `<button>` and a link can look
  identical.

Why separate these out? Because a function that formats a date has nothing to do
with rendering. Keeping it apart means you can test it in isolation and use it
anywhere.

### 5.4 `hooks/` — reusable logic

Custom hooks let multiple components share behaviour. Ours:

- `useAuth.ts` — read who is logged in.
- `usePostVote.ts` — the logic for voting on a post (with the clever optimistic
  update — see section 7).
- `useComments.ts` — creating and voting on comments.
- `useCommunityMembership.ts` — joining/leaving a community.
- `useFeedSort.ts` — read the sort order from the URL.
- `useOnClickOutside.ts` — close a dropdown when you click elsewhere.

A hook is how you avoid copy-pasting the same `useState` + logic into five
components.

### 5.5 `context/` — app-wide state

Some state is needed *everywhere*: who is logged in. Passing that down through
every component as a prop would be miserable (it is called "prop drilling").
**Context** is React's built-in way to make a value available to an entire
subtree.

`AuthProvider.tsx` holds the current user and provides `login`, `logout`, etc.
`useAuth()` reads from it. Any component, at any depth, can call `useAuth()` and
get the current user. No prop drilling.

### 5.6 `components/` — the UI pieces

These are the visual building blocks, grouped by feature. `ui/` has the generic
ones. `post/`, `comment/`, `layout/` have the feature-specific ones. Skim a few
files here — they are the most approachable in the whole project.

### 5.7 `pages/` — one component per URL

Each file is what you see at one route. `HomePage.tsx` is `/`,
`PostDetailPage.tsx` is `/posts/:postId`, and so on. Notice how *thin* these are.
They mostly just compose components together and wire up data. The heavy lifting
lives in components and hooks. That is intentional: fat pages become
unmaintainable.

### 5.8 `App.tsx` and `main.tsx` — the wiring

- `App.tsx` is the **map**: it lists every URL and which page renders for it.
- `main.tsx` is the **ignition**: it mounts React into the page and installs the
  providers (React Query, Auth, Router) that everything else depends on.

We will trace through both in the next section.

---

## 6. Following one click all the way through

Theory is easier to absorb when you see it move. Let us trace exactly what
happens, in order, from the moment the app starts to the moment you upvote a post.

### Step 0: the app boots (`main.tsx`)

```tsx
createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
```

Read this from the outside in. React starts, then wraps the app in three
**providers**:

- `QueryClientProvider` — makes React Query available everywhere below it.
- `AuthProvider` — makes "who is logged in" available everywhere below it.
- `BrowserRouter` — makes routing (URLs, `<Link>`, `useParams`) work below it.

A provider only works for components *underneath* it. That is why order matters —
anything using `useNavigate` must be inside `BrowserRouter`, so `<App/>` is the
innermost. If you ever see an error like *"useNavigate may be used only in the
context of a Router"*, it means a provider is nested too low.

### Step 1: the URL picks a page (`App.tsx`)

The user is at `/`. React Router looks at its route table:

```tsx
<Route element={<AppLayout />}>
  <Route index element={<HomePage />} />
  <Route path="c/:slug" element={<CommunityPage />} />
  <Route path="posts/:postId" element={<PostDetailPage />} />
  {/* ... */}
</Route>
```

`/` matches the `index` route, so it renders `<HomePage />` — but *inside*
`<AppLayout />`. `AppLayout` is the shell (header + sidebar) with a hole in the
middle (`<Outlet />`) where the current page appears. Because the layout wraps
every page, the header does not reload when you navigate. That is why an open
dropdown stays open when you move between pages.

### Step 2: the page asks for data (`HomePage.tsx`)

```tsx
const sort = useFeedSort()   // reads ?sort= from the URL, defaults to 'hot'

const { data, isLoading, error, refetch } = useQuery({
  queryKey: queryKeys.feed(sort),
  queryFn: () => fetchFeed(sort),
})
```

`useQuery` says: "I need the feed for this sort. Here is how to get it
(`fetchFeed`), and here is its cache name (`queryKey`)." React Query checks its
cache:

- If it has fresh data for this key, it returns it instantly — no request.
- Otherwise it calls `fetchFeed(sort)`, sets `isLoading` to true, and re-renders
  when the data arrives.

### Step 3: the page renders one of four states (`PostList.tsx`)

```tsx
if (isLoading) return <PostListSkeleton />
if (error)     return <ErrorState ... />
if (!posts || posts.length === 0) return <EmptyState ... />
return <div>{posts.map(post => <PostCard key={post.id} post={post} />)}</div>
```

This is a pattern worth burning into your memory. **Every list has four states:
loading, error, empty, and populated.** Beginners handle only the last one, and
then wonder why the page is blank while loading or after an error. Here all four
are handled in one place so no page can forget one.

While loading, we show a **skeleton** (`Skeleton.tsx`) — grey placeholder shapes
— instead of a spinner. The skeleton reserves the exact space the content will
take, so the page does not "jump" when data arrives. That jump has a name
(cumulative layout shift) and Google literally scores you down for it.

### Step 4: each post renders (`PostCard.tsx`)

`posts.map(...)` loops over the array and renders one `<PostCard>` per post. Note
the `key={post.id}`:

```tsx
{posts.map(post => <PostCard key={post.id} post={post} />)}
```

React needs a stable, unique `key` for each item in a list so it can tell them
apart between renders. **Always use a real ID, never the array index.** If you use
the index and a new post is inserted at the top, React thinks every post changed
and rebuilds all of them — losing focus, scroll position, and performance.

### Step 5: the user clicks upvote (`VoteControl.tsx` → `usePostVote.ts`)

`PostCard` renders a `<VoteControl>` and hands it a callback:

```tsx
<VoteControl
  score={post.score}
  viewerVote={post.viewerVote}
  onVote={(value) => vote.mutate({ id: post.id, value })}
/>
```

`VoteControl` itself is "dumb" — it just draws arrows and calls `onVote` when
clicked. It holds no data and makes no requests. That is why the same component
works for both posts and comments: the *parent* decides what a vote means.

The click calls `vote.mutate(...)`, which runs the optimistic-update logic in
`usePostVote.ts`. That logic is the most sophisticated part of the codebase, so
it gets its own section next.

---

## 7. The hard parts, explained slowly

### 7.1 Optimistic updates (`usePostVote.ts`)

**The problem.** When you click upvote, the naive approach is: send the request,
wait for the server, then update the number. Even on fast wifi that is a
noticeable pause after every click. It makes the app feel sluggish.

**The idea.** Update the screen *immediately*, assuming the vote will succeed.
Then, quietly, confirm with the server. If the server rejects it, undo the change.
This is called an **optimistic update** — you are optimistically assuming success.

Voting is perfect for this because votes almost always succeed, and if one fails,
the cost is just a number being briefly wrong.

**The sequence.** React Query gives us three hooks into a mutation's lifecycle:

```
onMutate   → runs BEFORE the request. Update the UI now, save a backup.
onError    → runs IF it fails. Restore the backup (undo).
onSettled  → runs AFTER either way. Ask the server for the real number.
```

Here is the actual code, annotated:

```ts
onMutate: async ({ id, value }) => {
  // 1. Stop any refetch already in progress, so it can't land later
  //    and overwrite what we're about to do.
  await queryClient.cancelQueries({ queryKey: ['posts'] })

  // 2. Take a backup of the current cache, so we can undo if needed.
  const snapshot = queryClient.getQueriesData({ queryKey: ['posts'] })

  // 3. Update the cache right now — the screen changes instantly.
  queryClient.setQueriesData({ queryKey: ['posts'] }, (cached) =>
    patchCache(cached, id, value),
  )

  return { snapshot }   // hand the backup to onError
},

onError: (_error, _variables, context) => {
  // The request failed. Put the backup back.
  context?.snapshot.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data)
  })
},

onSettled: () => {
  // Success or failure, refetch to get the server's real number.
  void queryClient.invalidateQueries({ queryKey: ['posts'] })
},
```

Two subtle things you should genuinely understand:

**Why cancel first?** Imagine a background refresh of the feed is already
downloading when you click vote. If it finishes *after* your optimistic update,
it will overwrite your vote with the old pre-vote data, and the number visibly
jumps backwards. Cancelling in-flight requests first prevents that race.

**Why is the score change `nextVote - previousVote` and not just +1?** Look at
`applyVote`:

```ts
const applyVote = (post, value) => {
  const nextVote = post.viewerVote === value ? 0 : value  // click same arrow = undo
  return {
    ...post,
    viewerVote: nextVote,
    score: post.score + (nextVote - post.viewerVote),
  }
}
```

If you had downvoted (`-1`) and now upvote (`+1`), the score must move by **2**,
not 1. Hardcoding `+1` is the most common voting bug, and it only shows up for
users who change their vote. The formula `next - previous` is always correct.

The `? 0 :` part is the toggle: clicking the arrow you already selected clears
your vote back to neutral.

### 7.2 Recursive components: the comment tree (`CommentItem.tsx`)

Comments can reply to comments, to any depth. How do you render something that
nests infinitely? With a component that **renders itself**.

```tsx
export function CommentItem({ comment, postId, depth }) {
  return (
    <article>
      {/* ...this comment's author, body, vote buttons... */}

      {comment.replies.map(reply => (
        <CommentItem              // ← it renders ITSELF for each reply
          key={reply.id}
          comment={reply}
          postId={postId}
          depth={depth + 1}       // ← one level deeper
        />
      ))}
    </article>
  )
}
```

This is **recursion** — the same solution as a function that calls itself. The
same twenty lines handle a top-level comment and a reply eight levels deep.

Every recursion needs a **base case** so it stops. Here it is implicit: a comment
whose `replies` array is empty renders no children, and the loop does nothing. The
data is guaranteed to be a tree (not a loop), because in the database a reply
always points to an *older* comment — you cannot reply to something that does not
exist yet.

One practical touch: visual indentation stops at `depth === 5`
(`MAX_INDENT_DEPTH`) even though the recursion keeps going. Otherwise a deep
thread would march off the right edge of a phone screen.

### 7.3 Query keys and cache invalidation (`queryClient.ts`)

React Query caches data under a **key**. Two components using the same key share
one cache entry and one request. That is powerful, but only if the keys are
consistent — so we define them all in one place:

```ts
export const queryKeys = {
  feed: (sort) => ['posts', 'feed', sort],
  post: (id) => ['posts', 'detail', id],
  comments: (postId) => ['posts', 'detail', postId, 'comments'],
  // ...
}
```

Keys are arrays, arranged as a hierarchy. This enables **prefix matching**: when
you tell React Query to refresh everything under `['posts']`, it refreshes the
feed *and* every post detail *and* every community feed, because they all start
with `'posts'`.

**Invalidation** means "this cached data might be out of date; refetch it." After
you post a comment, we invalidate two things:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.comments(postId) }) // the thread
  queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) })     // the count
}
```

Forgetting the second line is a classic bug: the comment appears, but the
"12 comments" label above still says 11 until you refresh.

### 7.4 Why comments are NOT optimistic (`useComments.ts`)

We just made voting optimistic. Why not comments? Because "always be optimistic"
is a real mistake.

Optimism is safe only when the operation almost always succeeds *and* the result
is predictable. A vote qualifies. A comment does not:

- The **server** decides the comment's ID and its official timestamp — we cannot
  guess them correctly.
- The server might reject the comment (too long, flagged as spam).

Rendering a comment that then disappears is far more jarring than waiting 300ms
for one that stays. So comment creation uses a plain, honest loading state. The
lesson: match the technique to the operation, do not cargo-cult a pattern
everywhere.

### 7.5 Context and providers (`AuthProvider.tsx`)

`AuthProvider` is a component that holds state (the current user) and shares it
with everything inside it via React Context.

```tsx
<AuthContext.Provider value={{ user, login, logout, ... }}>
  {children}
</AuthContext.Provider>
```

Anything rendered as `children` — which, because `AuthProvider` wraps the app, is
*everything* — can call `useAuth()` to read that value. No prop drilling.

One detail worth noticing: the value is wrapped in `useMemo`. An object written
`{ user, login }` is a brand-new object on every render, and React Query would
treat "new object" as "value changed" and re-render every consumer. `useMemo`
keeps the same object unless something inside it actually changed. This is a
performance habit, not a correctness one, but it matters when the provider wraps
the whole app.

> Reminder from Phase 1: this auth is a **simulation**. It accepts any password.
> Real password checking must happen on the backend in Phase 3 — never in the
> browser, because the browser is fully under the user's control.

---

## 8. TypeScript, just enough

You do not need to master TypeScript. You need these five ideas.

**1. Type annotations.** `name: string` means "name must be text." If you pass a
number, the editor complains before you run anything.

**2. Interfaces describe object shapes.**

```ts
interface User {
  id: string
  username: string
  avatarUrl: string | null   // either text or null
}
```

The `| null` is a **union type**: "one of these." It forces you to handle the
null case, which is how TypeScript prevents "cannot read property of null" crashes.

**3. Generics are types with a blank to fill in.** `Post[]` means "an array of
Post." `Promise<Post>` means "a promise that will produce a Post." The `<...>` is
the blank.

**4. `type` aliases name a type.**

```ts
export type VoteValue = 1 | 0 | -1   // a vote can only be these three
```

Now `VoteValue` can only ever be one of those three numbers. Try to assign `5`
and TypeScript stops you.

**5. It disappears at runtime.** TypeScript is checked while you code and then
*stripped out*. The browser runs plain JavaScript. Types are a safety net for
*you*, not something that exists when the app runs.

The payoff: when you change a type — say you add a required field to `Post` — every
place that is now wrong lights up red immediately, including our mock data. You
find all the breakage in seconds instead of at runtime.

---

## 9. How the styling works

We use **Tailwind CSS**. Instead of writing CSS in a separate file, you put small
utility classes directly on the element:

```tsx
<div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
```

Reading that: flex layout, 3 units of gap between children, extra-large rounded
corners, a light grey border, white background, 4 units of padding. Each class
does one thing.

Why do this instead of "proper" CSS files? Because you never have to invent class
names, jump between files, or worry that editing one style breaks something else
across the app. What you see on the element is exactly what it looks like. It
feels wrong at first and then becomes very fast.

Our design **tokens** (brand colours, etc.) are defined once in `src/index.css`
using Tailwind v4's `@theme` block:

```css
@theme {
  --color-brand-600: #4f46e5;
  --color-upvote: #f97316;
}
```

That is why we write `bg-brand-600` instead of `bg-[#4f46e5]` everywhere. If we
rebrand, we change one line, not forty.

The `cn()` helper (in `format.ts`) combines classes conditionally:

```tsx
cn('rounded border', isActive && 'border-brand-600')
```

If `isActive` is false, the second class is dropped. This is cleaner than
building strings with ternaries.

---

## 10. How to read this codebase on your own

A suggested path, from easiest to hardest:

1. **`src/types/index.ts`** — learn the data shapes. Everything references these.
2. **`src/components/ui/Button.tsx`** and **`Card.tsx`** — the simplest
   components. Pure props in, UI out.
3. **`src/components/ui/Avatar.tsx`** — slightly more logic (the colour hash).
4. **`src/mocks/api.ts`** — see what "the backend" offers.
5. **`src/pages/HomePage.tsx`** — see a page fetch data and render a list.
6. **`src/components/post/PostList.tsx`** — the four-states pattern.
7. **`src/components/post/PostCard.tsx`** — composition of smaller components.
8. **`src/hooks/usePostVote.ts`** — the optimistic update. Re-read section 7.1
   alongside it.
9. **`src/components/comment/CommentItem.tsx`** — recursion. Re-read section 7.2.
10. **`src/App.tsx`** and **`src/main.tsx`** — how it is all wired together.

A powerful way to learn: **change something and watch what happens.** The dev
server hot-reloads instantly. Some safe experiments:

- In `src/mocks/data.ts`, change a post's `title` or `score`. Watch it update.
- In `src/components/ui/Button.tsx`, change a colour class and see every button
  change.
- In `PostList.tsx`, temporarily `return <PostListSkeleton />` at the top to see
  the loading state without waiting.
- Add a `console.log(post)` inside `PostCard` and open the browser console to see
  the real data flowing through.

Every file has a comment block at the top explaining its purpose. Read those
first — they are written for exactly this.

---

## 11. Glossary

| Term | Meaning |
| --- | --- |
| **Component** | A function that returns UI (JSX). The building block of React. |
| **JSX** | HTML-like syntax inside JavaScript that describes UI. |
| **Props** | Data passed into a component from its parent. Read-only. |
| **State** | Data a component owns and can change; changing it re-renders. |
| **Hook** | A `use…` function that plugs into React's features. |
| **Render** | React running your component function to figure out what to show. |
| **SPA** | Single-page application: one HTML file, JS swaps the content. |
| **Server state** | Data owned by the backend; managed by React Query here. |
| **Query** | A read from the server (React Query's `useQuery`). |
| **Mutation** | A write to the server (React Query's `useMutation`). |
| **Query key** | The cache name for a piece of server data. |
| **Invalidate** | Mark cached data stale so React Query refetches it. |
| **Optimistic update** | Update the UI before the server confirms, undo on failure. |
| **Provider** | A component that shares a value with everything inside it (Context). |
| **Context** | React's mechanism for app-wide state without prop drilling. |
| **Prop drilling** | Passing a prop through many layers just to reach a deep child. |
| **Route** | A URL pattern mapped to a page component. |
| **Recursion** | A component (or function) that uses itself to handle nesting. |
| **Skeleton** | Grey placeholder shapes shown while data loads. |
| **Seam** | The single boundary (here, `mocks/api.ts`) where data comes from. |
| **N+1 problem** | Fetching a list, then one extra request per item — too many requests. |

---

## Where to go next

You now have the vocabulary and the mental models. The best next move is to open
the files in the order listed in section 10, with this document beside you. When
something is confusing, find its term in the glossary or its section above.

And when you are ready to build the backend, the file to study first is
`src/types/index.ts` — those shapes become the database tables and API responses
of Phase 2. The frontend and backend meet at the data model, which is why we
designed it so carefully before writing a single page.
```
