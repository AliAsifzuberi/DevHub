/**
 * A single community: its banner, description, and feed.
 *
 * Purpose: the scoped equivalent of the home page.
 *
 * Dependencies: React Router (for the URL parameter), React Query, and the
 * feed components.
 */
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { PostList } from '@/components/post/PostList'
import { SortTabs } from '@/components/post/SortTabs'
import { useFeedSort } from '@/hooks/useFeedSort'
import { useAuth } from '@/hooks/useAuth'
import { useCommunityMembership } from '@/hooks/useCommunityMembership'
import { fetchCommunity, fetchCommunityPosts } from '@/mocks/api'
import { queryKeys } from '@/lib/queryClient'
import { formatCompactNumber } from '@/lib/format'

export function CommunityPage() {
  /**
   * `useParams` reads the dynamic segment from the route pattern `/c/:slug`.
   * It is typed as possibly undefined because TypeScript cannot know which
   * route is currently matched — the guard below is genuinely necessary, not
   * ceremony.
   */
  const { slug } = useParams<{ slug: string }>()
  const sort = useFeedSort()
  const { user } = useAuth()
  const membership = useCommunityMembership()

  const communityQuery = useQuery({
    queryKey: queryKeys.community(slug ?? ''),
    queryFn: () => fetchCommunity(slug!),
    /**
     * `enabled` prevents the query from running with a missing slug. Without
     * it React Query would fire a request for `/communities/undefined` on the
     * first render — a guaranteed 404, and a surprisingly common source of
     * phantom errors in logs.
     */
    enabled: Boolean(slug),
  })

  const postsQuery = useQuery({
    queryKey: queryKeys.communityPosts(slug ?? '', sort),
    queryFn: () => fetchCommunityPosts(slug!, sort),
    enabled: Boolean(slug),
  })

  if (communityQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-10 w-64 rounded-xl" />
      </div>
    )
  }

  if (communityQuery.error || !communityQuery.data) {
    return (
      <ErrorState
        title="Community not found"
        message={`There is no community at c/${slug}.`}
      />
    )
  }

  const community = communityQuery.data

  return (
    <div>
      <Card className="mb-4 overflow-hidden">
        {/* A coloured band derived from the community's own accent colour,
            standing in for the uploaded banner image that Phase 5 will add. */}
        <div
          className="h-16"
          style={{ backgroundColor: community.accentColor }}
          aria-hidden="true"
        />

        <div className="flex flex-wrap items-start gap-4 p-4">
          <Avatar
            name={community.name}
            color={community.accentColor}
            size="lg"
            className="-mt-10 border-4 border-white"
          />

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900">
              {community.name}
            </h1>
            <p className="text-sm text-slate-500">
              c/{community.slug} ·{' '}
              {formatCompactNumber(community.memberCount)} members
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {community.description}
            </p>
          </div>

          {user && (
            <Button
              variant={community.isMember ? 'secondary' : 'primary'}
              isLoading={membership.isPending}
              onClick={() =>
                membership.mutate({
                  slug: community.slug,
                  isMember: community.isMember,
                })
              }
            >
              {community.isMember ? 'Joined' : 'Join'}
            </Button>
          )}
        </div>
      </Card>

      <SortTabs />

      <PostList
        posts={postsQuery.data}
        isLoading={postsQuery.isLoading}
        error={postsQuery.error}
        onRetry={() => void postsQuery.refetch()}
        /* Every post here belongs to this community, so repeating the badge
           on all of them would be pure noise. */
        hideCommunity
        emptyTitle={`No posts in c/${community.slug} yet`}
        emptyDescription="This community is waiting for its first discussion."
        emptyAction={
          <LinkButton to={`/submit?community=${community.slug}`} size="sm">
            Create a post
          </LinkButton>
        }
      />
    </div>
  )
}
