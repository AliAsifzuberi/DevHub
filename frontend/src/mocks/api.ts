/**
 * A fake API that behaves like a real one.
 *
 * Purpose: provide the exact async interface the real backend will expose, so
 * that every component above this layer is already written against the truth.
 *
 * The critical design idea here is the **seam**. Components never import
 * `mocks/data.ts` directly. They call these functions, which are async and can
 * fail — just like HTTP. When Phase 3 arrives, the body of each function is
 * replaced with an `apiClient.get(...)` call and *nothing above this file
 * changes*. If components read the mock arrays synchronously instead, every
 * one of them would need rewriting the day the backend lands, because
 * synchronous code cannot absorb network latency.
 *
 * Two behaviours are simulated deliberately:
 *   - Latency, so loading states are actually visible during development. A
 *     spinner that never appears locally is a spinner nobody tests.
 *   - Errors on missing resources, so error states get exercised too.
 *
 * Dependencies: the seed data and the domain types. Nothing else — this file
 * has no knowledge of React.
 */
import type {
  AppNotification,
  Comment,
  Community,
  ID,
  Post,
  User,
  VoteValue,
} from '@/types'
import {
  commentsByPostId,
  communities,
  currentUser,
  notifications,
  posts,
  users,
} from './data'

/** How the feed can be ordered. Mirrors the future `?sort=` query parameter. */
export type FeedSort = 'hot' | 'new' | 'top'

/**
 * Simulated network delay. Randomised within a range rather than fixed,
 * because a constant delay lets race conditions hide — real networks are
 * jittery, and inconsistent timing surfaces bugs where two requests resolve
 * out of order.
 */
const latency = (min = 180, max = 420): Promise<void> => {
  const ms = min + Math.random() * (max - min)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Deep-clones the data before returning it.
 *
 * Without this, a component that mutates a returned object would silently
 * corrupt the module-level seed data, and the bug would only appear after
 * navigating away and back. Returning a copy models the reality of HTTP: you
 * always get a fresh deserialised object, never a live reference to the
 * server's memory.
 */
const clone = <T>(value: T): T => structuredClone(value)

/**
 * Thrown for missing resources so the UI can distinguish "not found" from a
 * genuine failure. The real client will map an HTTP 404 onto this same shape.
 */
export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`)
    this.name = 'NotFoundError'
  }
}

/**
 * "Hot" ranking: score decayed by age.
 *
 * A pure score sort would let a three-year-old post with 50,000 upvotes sit at
 * the top forever, and the feed would never change. Dividing by elapsed time
 * means a post has to keep earning its position. The `+2` prevents division by
 * zero for a brand-new post, and the exponent controls how aggressively age is
 * punished — this is a simplified form of the algorithm Reddit and Hacker News
 * use. In Phase 4 this computation moves to the backend and its result gets
 * cached in Redis, because ranking every post on every page load is exactly
 * the kind of expensive query a cache exists for.
 */
const hotRank = (post: Post): number => {
  const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / 3_600_000
  return post.score / Math.pow(ageHours + 2, 1.5)
}

const sortPosts = (list: Post[], sort: FeedSort): Post[] => {
  const copy = [...list]
  switch (sort) {
    case 'new':
      return copy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    case 'top':
      return copy.sort((a, b) => b.score - a.score)
    case 'hot':
      return copy.sort((a, b) => hotRank(b) - hotRank(a))
  }
}

/* ------------------------------------------------------------------ *
 * Reads                                                               *
 * ------------------------------------------------------------------ */

/** GET /api/posts?sort= */
export async function fetchFeed(sort: FeedSort = 'hot'): Promise<Post[]> {
  await latency()
  return clone(sortPosts(posts, sort))
}

/** GET /api/posts/{id} */
export async function fetchPost(id: ID): Promise<Post> {
  await latency()
  const post = posts.find((p) => p.id === id)
  if (!post) throw new NotFoundError('Post')
  return clone(post)
}

/** GET /api/posts/{id}/comments */
export async function fetchComments(postId: ID): Promise<Comment[]> {
  await latency()
  return clone(commentsByPostId[postId] ?? [])
}

/** GET /api/communities */
export async function fetchCommunities(): Promise<Community[]> {
  await latency()
  return clone([...communities].sort((a, b) => b.memberCount - a.memberCount))
}

/** GET /api/communities/{slug} */
export async function fetchCommunity(slug: string): Promise<Community> {
  await latency()
  const community = communities.find((c) => c.slug === slug)
  if (!community) throw new NotFoundError('Community')
  return clone(community)
}

/** GET /api/communities/{slug}/posts */
export async function fetchCommunityPosts(
  slug: string,
  sort: FeedSort = 'hot',
): Promise<Post[]> {
  await latency()
  const matching = posts.filter((p) => p.community.slug === slug)
  return clone(sortPosts(matching, sort))
}

/** GET /api/users/{username} */
export async function fetchUser(username: string): Promise<User> {
  await latency()
  const user = Object.values(users).find((u) => u.username === username)
  if (!user) throw new NotFoundError('User')
  return clone(user)
}

/** GET /api/users/{username}/posts */
export async function fetchUserPosts(username: string): Promise<Post[]> {
  await latency()
  const matching = posts.filter((p) => p.author.username === username)
  return clone(sortPosts(matching, 'new'))
}

/** GET /api/notifications */
export async function fetchNotifications(): Promise<AppNotification[]> {
  await latency(120, 260)
  return clone(notifications)
}

/* ------------------------------------------------------------------ *
 * Writes                                                              *
 * ------------------------------------------------------------------ */

/**
 * POST /api/posts/{id}/vote
 *
 * Note the toggle semantics: clicking the arrow you already selected clears
 * the vote rather than applying it twice. Getting this right matters because
 * the score delta is the difference between the old and new vote, not simply
 * plus or minus one — switching from downvote to upvote is a swing of two.
 * That arithmetic is easy to get wrong, and wrong vote counts erode trust in
 * the whole product.
 */
export async function votePost(id: ID, value: VoteValue): Promise<Post> {
  await latency(80, 200)
  const post = posts.find((p) => p.id === id)
  if (!post) throw new NotFoundError('Post')

  const nextVote: VoteValue = post.viewerVote === value ? 0 : value
  post.score += nextVote - post.viewerVote
  post.viewerVote = nextVote
  return clone(post)
}

/** POST /api/comments/{id}/vote — same toggle rules as posts. */
export async function voteComment(
  postId: ID,
  commentId: ID,
  value: VoteValue,
): Promise<void> {
  await latency(80, 200)

  // Comments form a tree, so finding one means walking it. A flat array lookup
  // is not enough once replies can nest arbitrarily deep.
  const findInTree = (list: Comment[]): Comment | undefined => {
    for (const comment of list) {
      if (comment.id === commentId) return comment
      const nested = findInTree(comment.replies)
      if (nested) return nested
    }
    return undefined
  }

  const target = findInTree(commentsByPostId[postId] ?? [])
  if (!target) throw new NotFoundError('Comment')

  const nextVote: VoteValue = target.viewerVote === value ? 0 : value
  target.score += nextVote - target.viewerVote
  target.viewerVote = nextVote
}

export interface CreatePostInput {
  title: string
  body: string
  communitySlug: string
}

/** POST /api/posts */
export async function createPost(input: CreatePostInput): Promise<Post> {
  await latency(300, 600)
  const community = communities.find((c) => c.slug === input.communitySlug)
  if (!community) throw new NotFoundError('Community')

  const post: Post = {
    // The real backend generates UUIDs. `crypto.randomUUID` is built into
    // modern browsers, so no dependency is needed for a realistic stand-in.
    id: `p_${crypto.randomUUID().slice(0, 8)}`,
    title: input.title.trim(),
    body: input.body.trim(),
    author: currentUser,
    community,
    createdAt: new Date().toISOString(),
    score: 1,
    commentCount: 0,
    viewerVote: 1,
  }

  posts.unshift(post)
  commentsByPostId[post.id] = []
  return clone(post)
}

export interface CreateCommentInput {
  postId: ID
  parentId: ID | null
  body: string
}

/** POST /api/posts/{id}/comments */
export async function createComment(
  input: CreateCommentInput,
): Promise<Comment> {
  await latency(250, 500)
  const post = posts.find((p) => p.id === input.postId)
  if (!post) throw new NotFoundError('Post')

  const comment: Comment = {
    id: `cm_${crypto.randomUUID().slice(0, 8)}`,
    postId: input.postId,
    parentId: input.parentId,
    author: currentUser,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
    score: 1,
    viewerVote: 1,
    replies: [],
  }

  const thread = (commentsByPostId[input.postId] ??= [])

  if (input.parentId === null) {
    thread.push(comment)
  } else {
    const attachToParent = (list: Comment[]): boolean => {
      for (const candidate of list) {
        if (candidate.id === input.parentId) {
          candidate.replies.push(comment)
          return true
        }
        if (attachToParent(candidate.replies)) return true
      }
      return false
    }
    if (!attachToParent(thread)) throw new NotFoundError('Parent comment')
  }

  // The post's comment count includes nested replies, so every insertion
  // increments it regardless of depth.
  post.commentCount += 1
  return clone(comment)
}

/** POST /api/communities/{slug}/join and DELETE for leaving. */
export async function toggleCommunityMembership(
  slug: string,
): Promise<Community> {
  await latency(150, 300)
  const community = communities.find((c) => c.slug === slug)
  if (!community) throw new NotFoundError('Community')

  community.isMember = !community.isMember
  community.memberCount += community.isMember ? 1 : -1
  return clone(community)
}
