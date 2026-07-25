/**
 * The home feed — posts from every community.
 *
 * Purpose: the application's landing page and the first thing a new user sees.
 *
 * Note how thin this page is. Fetching lives in React Query, list rendering
 * and its four states live in `PostList`, and sorting lives in `SortTabs`. The
 * page's only job is composition: decide which pieces appear and wire them
 * together. Pages that also fetch, format, and render tend to grow past 300
 * lines and become the hardest files in a codebase to change safely.
 *
 * Dependencies: React Query, the feed components, and the API layer.
 */
import { useQuery } from '@tanstack/react-query'
import { PostList } from '@/components/post/PostList'
import { SortTabs } from '@/components/post/SortTabs'
import { useFeedSort } from '@/hooks/useFeedSort'
import { LinkButton } from '@/components/ui/LinkButton'
import { fetchFeed } from '@/mocks/api'
import { queryKeys } from '@/lib/queryClient'

export function HomePage() {
  const sort = useFeedSort()

  const { data, isLoading, error, refetch } = useQuery({
    /**
     * The sort is part of the query key, which is what makes caching correct
     * here. Each ordering gets its own cache entry, so switching from Hot to
     * Top and back is instant on the second visit. Had the key been a bare
     * `['feed']`, React Query would consider both orderings the same data and
     * serve whichever was fetched last — the wrong list, with no refetch.
     */
    queryKey: queryKeys.feed(sort),
    queryFn: () => fetchFeed(sort),
  })

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Home</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Discussions from across every community you follow.
        </p>
      </div>

      <SortTabs />

      <PostList
        posts={data}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        emptyTitle="Your feed is empty"
        emptyDescription="Join a few communities, or start a discussion of your own."
        emptyAction={
          <LinkButton to="/submit" size="sm">
            Create a post
          </LinkButton>
        }
      />
    </div>
  )
}
