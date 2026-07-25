/**
 * Domain model for DevHub.
 *
 * This file is the single source of truth for "what shapes exist in this
 * application". Every component, mock, and (from Phase 3) API response is
 * typed against these interfaces.
 *
 * Why define this before writing any UI?
 * Because the data model is the part that is expensive to change later. A
 * badly named CSS class costs a minute to fix; a wrong relationship between
 * posts and comments costs a database migration, an API version bump, and a
 * frontend refactor. These interfaces are deliberately written to mirror the
 * PostgreSQL tables we will create in Phase 2, so the two stay aligned.
 */

/**
 * Every entity is keyed by a string ID rather than a number.
 *
 * The database will use UUIDs, not auto-incrementing integers. Two reasons:
 * sequential integer IDs leak business information (a competitor can read
 * `/posts/1042` and know you have ~1000 posts), and they make it impossible to
 * generate an ID client-side or merge data across shards. The alias also means
 * that if we ever change the format, there is one line to edit.
 */
export type ID = string

/**
 * A vote is tri-state, not boolean. `0` means "no vote", which is a genuinely
 * different state from "downvoted" and must round-trip correctly when a user
 * clicks the same arrow twice to undo their vote.
 */
export type VoteValue = 1 | 0 | -1

/**
 * A user account.
 *
 * Note what is absent: there is no `password`, no `passwordHash`, and no
 * `email`. This type describes a user as seen *by other users*, and the
 * frontend must never receive credentials or private contact details. Keeping
 * them out of the type makes it a compile-time error to accidentally render
 * them. In Phase 2 the backend will enforce the same boundary with separate
 * Pydantic schemas for public and private views of the same table.
 */
export interface User {
  id: ID
  username: string
  displayName: string
  /** Null until the user uploads one; Phase 5 stores these in Cloud Storage. */
  avatarUrl: string | null
  bio: string | null
  /** ISO-8601 UTC string. See the note on dates at the bottom of this file. */
  createdAt: string
  karma: number
}

/**
 * A community — the DevHub equivalent of a subreddit.
 */
export interface Community {
  id: ID
  /**
   * URL-safe identifier used in routes (`/c/devops`). Kept separate from
   * `name` so the display name can be renamed without breaking every existing
   * link, and so the URL never has to be escaped.
   */
  slug: string
  name: string
  description: string
  memberCount: number
  createdAt: string
  /**
   * Placeholder avatar colour, used until real image uploads exist. Storing a
   * deterministic colour beats a random one: the same community looks the same
   * on every page load and for every user.
   */
  accentColor: string
  /**
   * Viewer-relative state: is *the currently logged-in user* a member?
   *
   * This is worth pausing on. Most fields here are facts about the entity and
   * identical for everyone. This one depends on who is asking, which has real
   * consequences later — viewer-relative fields cannot be cached in a shared
   * Redis key, because caching "isMember: true" from one user's request and
   * serving it to another user would be a data leak. In Phase 4 we will cache
   * the shared parts and merge in per-viewer state separately.
   */
  isMember: boolean
}

/**
 * A post: the top-level unit of discussion.
 *
 * `author` and `community` are embedded objects rather than bare foreign-key
 * IDs. This is a deliberate denormalisation of the read model. The database
 * will store `posts.author_id` and `posts.community_id` as foreign keys, but
 * the API returns them expanded, because otherwise rendering a 25-post feed
 * would require the frontend to fire 50 extra requests to resolve names and
 * avatars. Doing the join once on the server is far cheaper than doing it
 * many times over the network — the classic N+1 query problem, which we are
 * designing out from the start rather than discovering under load.
 */
export interface Post {
  id: ID
  title: string
  body: string
  author: User
  community: Community
  createdAt: string
  /** Denormalised aggregate: upvotes minus downvotes. */
  score: number
  /** Denormalised aggregate: total comments including all nested replies. */
  commentCount: number
  /** Viewer-relative — see the note on `Community.isMember`. */
  viewerVote: VoteValue
}

/**
 * A comment, which may itself have replies to arbitrary depth.
 *
 * The recursion is the interesting part. In the database this is a single
 * table with a self-referencing foreign key: `comments.parent_id` points at
 * `comments.id`, and is NULL for a top-level comment. That one nullable column
 * is what turns a flat table into a tree.
 *
 * The API flattens that tree into this nested `replies` array so the frontend
 * can render it with a recursive component, rather than reconstructing the
 * hierarchy in the browser.
 */
export interface Comment {
  id: ID
  postId: ID
  /** NULL for a top-level comment; otherwise the comment being replied to. */
  parentId: ID | null
  author: User
  body: string
  createdAt: string
  score: number
  viewerVote: VoteValue
  replies: Comment[]
}

/**
 * A notification delivered to a user.
 *
 * In Phase 4 these will arrive over a WebSocket fed by Redis Pub/Sub. For now
 * they are static, but the shape is designed for that future: `type`
 * discriminates the variant so the UI can pick an icon and phrasing, and
 * `link` lets the notification navigate somewhere without the component
 * needing to know how to build a URL for each kind.
 */
export type NotificationType = 'comment' | 'reply' | 'vote'

export interface AppNotification {
  id: ID
  type: NotificationType
  /** Pre-rendered summary, e.g. "alex replied to your comment". */
  message: string
  /** Client-side route to open when clicked. */
  link: string
  isRead: boolean
  createdAt: string
}

/**
 * A note on dates, because this trips up almost everyone once.
 *
 * All timestamps are ISO-8601 strings in UTC, never JavaScript `Date` objects.
 * JSON has no date type, so a `Date` sent over the wire becomes a string
 * anyway — typing it as `Date` would be a lie that `JSON.parse` quietly
 * breaks. Storing UTC and converting to local time only at render time avoids
 * the entire class of timezone bugs where a post appears to be created
 * tomorrow for users east of the server.
 */
