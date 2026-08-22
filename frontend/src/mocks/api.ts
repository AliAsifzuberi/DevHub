/**
 * Real API client — same function names as the Phase 1 mocks.
 *
 * Purpose: the seam between UI and backend. Components import from here;
 * Phase 3 swapped the bodies from in-memory fakes to Axios calls. Signatures
 * stayed the same so HomePage, usePostVote, etc. barely changed.
 *
 * Dependencies: apiClient, domain types.
 */
import { apiClient, type ApiError } from '@/lib/apiClient'
import type {
  AppNotification,
  Comment,
  Community,
  ID,
  Post,
  User,
  VoteValue,
} from '@/types'

export type FeedSort = 'hot' | 'new' | 'top'

/**
 * Thrown for HTTP 404 so React Query can skip retries (see queryClient.ts).
 */
export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`)
    this.name = 'NotFoundError'
  }
}

const rethrow = (error: unknown, resource: string): never => {
  const apiError = error as ApiError
  if (apiError?.status === 404) throw new NotFoundError(resource)
  throw error
}

/* ------------------------------------------------------------------ *
 * Auth                                                                *
 * ------------------------------------------------------------------ */

export interface AuthTokenResponse {
  accessToken: string
  tokenType: string
  user: User
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<AuthTokenResponse> {
  const { data } = await apiClient.post<AuthTokenResponse>('/auth/login', {
    username,
    password,
  })
  return data
}

export async function registerRequest(input: {
  username: string
  displayName?: string
  email: string
  password: string
}): Promise<AuthTokenResponse> {
  const { data } = await apiClient.post<AuthTokenResponse>('/auth/register', {
    username: input.username,
    displayName: input.displayName || undefined,
    email: input.email,
    password: input.password,
  })
  return data
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me')
  return data
}

/* ------------------------------------------------------------------ *
 * Reads                                                               *
 * ------------------------------------------------------------------ */

export async function fetchFeed(sort: FeedSort = 'hot'): Promise<Post[]> {
  const { data } = await apiClient.get<Post[]>('/posts', { params: { sort } })
  return data
}

export async function fetchPost(id: ID): Promise<Post> {
  try {
    const { data } = await apiClient.get<Post>(`/posts/${id}`)
    return data
  } catch (error) {
    return rethrow(error, 'Post')
  }
}

export async function fetchComments(postId: ID): Promise<Comment[]> {
  try {
    const { data } = await apiClient.get<Comment[]>(`/posts/${postId}/comments`)
    return data
  } catch (error) {
    return rethrow(error, 'Post')
  }
}

export async function fetchCommunities(): Promise<Community[]> {
  const { data } = await apiClient.get<Community[]>('/communities')
  return data
}

export async function fetchCommunity(slug: string): Promise<Community> {
  try {
    const { data } = await apiClient.get<Community>(`/communities/${slug}`)
    return data
  } catch (error) {
    return rethrow(error, 'Community')
  }
}

export async function fetchCommunityPosts(
  slug: string,
  sort: FeedSort = 'hot',
): Promise<Post[]> {
  try {
    const { data } = await apiClient.get<Post[]>(`/communities/${slug}/posts`, {
      params: { sort },
    })
    return data
  } catch (error) {
    return rethrow(error, 'Community')
  }
}

export async function fetchUser(username: string): Promise<User> {
  try {
    const { data } = await apiClient.get<User>(`/users/${username}`)
    return data
  } catch (error) {
    return rethrow(error, 'User')
  }
}

export async function fetchUserPosts(username: string): Promise<Post[]> {
  try {
    const { data } = await apiClient.get<Post[]>(`/users/${username}/posts`)
    return data
  } catch (error) {
    return rethrow(error, 'User')
  }
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data } = await apiClient.get<AppNotification[]>('/notifications')
  return data
}

/* ------------------------------------------------------------------ *
 * Writes                                                              *
 * ------------------------------------------------------------------ */

export async function votePost(id: ID, value: VoteValue): Promise<Post> {
  if (value === 0) {
    throw new Error('Client should send 1 or -1; the server handles toggle-off.')
  }
  const { data } = await apiClient.post<Post>(`/posts/${id}/vote`, { value })
  return data
}

export async function voteComment(
  _postId: ID,
  commentId: ID,
  value: VoteValue,
): Promise<void> {
  if (value === 0) {
    throw new Error('Client should send 1 or -1; the server handles toggle-off.')
  }
  await apiClient.post(`/comments/${commentId}/vote`, { value })
}

export interface CreatePostInput {
  title: string
  body: string
  communitySlug: string
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  try {
    const { data } = await apiClient.post<Post>('/posts', {
      title: input.title,
      body: input.body,
      communitySlug: input.communitySlug,
    })
    return data
  } catch (error) {
    return rethrow(error, 'Community')
  }
}

export interface CreateCommentInput {
  postId: ID
  parentId: ID | null
  body: string
}

export async function createComment(
  input: CreateCommentInput,
): Promise<Comment> {
  try {
    const { data } = await apiClient.post<Comment>(
      `/posts/${input.postId}/comments`,
      {
        body: input.body,
        parentId: input.parentId,
      },
    )
    return data
  } catch (error) {
    return rethrow(error, 'Post')
  }
}

export async function joinCommunity(slug: string): Promise<Community> {
  try {
    const { data } = await apiClient.post<Community>(
      `/communities/${slug}/join`,
    )
    return data
  } catch (error) {
    return rethrow(error, 'Community')
  }
}

export async function leaveCommunity(slug: string): Promise<Community> {
  try {
    const { data } = await apiClient.delete<Community>(
      `/communities/${slug}/join`,
    )
    return data
  } catch (error) {
    return rethrow(error, 'Community')
  }
}

/**
 * Convenience for the UI: join if not a member, leave if already joined.
 */
export async function toggleCommunityMembership(
  slug: string,
  isMember: boolean,
): Promise<Community> {
  return isMember ? leaveCommunity(slug) : joinCommunity(slug)
}
