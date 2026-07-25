/**
 * React Query client configuration.
 *
 * Purpose: define how server data is cached, refetched, and retried across the
 * whole application.
 *
 * The concept worth internalising: React Query manages **server state**, which
 * is fundamentally different from the UI state that `useState` handles.
 * Server state is owned by someone else, can change without you knowing, and
 * can go stale. Treating it like local state — fetching in a `useEffect` and
 * storing the result in `useState` — means hand-writing loading flags, error
 * flags, caching, deduplication, and refetching in every component. React
 * Query does all of it once.
 *
 * Dependencies: @tanstack/react-query only.
 */
import { QueryClient } from '@tanstack/react-query'
import { NotFoundError } from '@/mocks/api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * How long fetched data is considered fresh. While fresh, remounting a
       * component reuses the cache instead of hitting the network.
       *
       * The default is 0, meaning every mount refetches. For a discussion feed
       * that is wasteful — navigating into a post and pressing Back should not
       * re-download the entire feed. Thirty seconds is a reasonable balance for
       * content that changes often but not by the second.
       */
      staleTime: 30_000,

      /**
       * Refetching whenever the window regains focus is on by default. It is
       * a genuinely nice behaviour for dashboards, but during development it
       * fires every time you alt-tab back from your editor, which makes the
       * network tab noisy and loading states flicker. Off for clarity.
       */
      refetchOnWindowFocus: false,

      /**
       * Do not retry a request that failed because the resource does not
       * exist. Retrying a 404 three times cannot succeed — it only delays
       * showing the user the "not found" page by a second or two. Transient
       * failures (network blips, 503s) are worth retrying; deterministic ones
       * are not.
       */
      retry: (failureCount, error) => {
        if (error instanceof NotFoundError) return false
        return failureCount < 2
      },
    },
    mutations: {
      /**
       * Mutations are not retried automatically. A failed GET is safe to
       * repeat, but a failed POST may have actually succeeded on the server
       * before the response was lost — retrying it could create two posts.
       * Retrying non-idempotent operations needs explicit thought, so the
       * default is to do nothing.
       */
      retry: false,
    },
  },
})

/**
 * Centralised query keys.
 *
 * A query key is React Query's cache identity: two components using the same
 * key share one cache entry and one network request. Typing keys inline as
 * string literals invites drift — `['posts']` in one file and `['post']` in
 * another silently create two caches, and invalidating one leaves the other
 * stale. That produces the classic "I posted a comment but the count did not
 * update" bug.
 *
 * Defining them here as a hierarchy means invalidating `['posts']` also
 * invalidates `['posts', 'detail', id]`, because React Query matches keys by
 * prefix.
 */
export const queryKeys = {
  feed: (sort: string) => ['posts', 'feed', sort] as const,
  post: (id: string) => ['posts', 'detail', id] as const,
  comments: (postId: string) => ['posts', 'detail', postId, 'comments'] as const,
  communities: () => ['communities'] as const,
  community: (slug: string) => ['communities', 'detail', slug] as const,
  communityPosts: (slug: string, sort: string) =>
    ['communities', 'detail', slug, 'posts', sort] as const,
  user: (username: string) => ['users', 'detail', username] as const,
  userPosts: (username: string) => ['users', 'detail', username, 'posts'] as const,
  notifications: () => ['notifications'] as const,
}
