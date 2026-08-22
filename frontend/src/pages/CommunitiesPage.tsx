/**
 * Directory of every community.
 *
 * Purpose: discovery. New users need a way to find communities worth joining
 * before their feed means anything.
 *
 * Dependencies: React Query, the membership hook, and the UI primitives.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useCommunityMembership } from '@/hooks/useCommunityMembership'
import { fetchCommunities } from '@/mocks/api'
import { queryKeys } from '@/lib/queryClient'
import { formatCompactNumber } from '@/lib/format'

export function CommunitiesPage() {
  const { user } = useAuth()
  const membership = useCommunityMembership()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.communities(),
    queryFn: fetchCommunities,
  })

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">Communities</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Find a place to ask questions and share what you have learned.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="flex items-center gap-3 p-4">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <ErrorState
          message="We could not load the community list."
          onRetry={() => void refetch()}
        />
      )}

      {data?.length === 0 && (
        <EmptyState
          title="No communities yet"
          description="Communities will appear here once they are created."
        />
      )}

      <div className="space-y-3">
        {data?.map((community) => (
          <Card key={community.id} interactive className="p-4">
            <div className="flex items-start gap-3">
              <Avatar
                name={community.name}
                color={community.accentColor}
                size="md"
              />

              <div className="min-w-0 flex-1">
                <Link
                  to={`/c/${community.slug}`}
                  className="text-base font-semibold text-slate-900 hover:text-brand-700"
                >
                  c/{community.slug}
                </Link>
                <p className="text-xs text-slate-500">
                  {formatCompactNumber(community.memberCount)} members
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {community.description}
                </p>
              </div>

              {/*
                The join control only renders for signed-in users. Showing a
                button that always fails is worse than showing nothing: it
                invites a click and then punishes it. Anonymous visitors get
                the sign-up path from the header instead.
              */}
              {user && (
                <Button
                  size="sm"
                  variant={community.isMember ? 'secondary' : 'primary'}
                  isLoading={
                    membership.isPending &&
                    membership.variables?.slug === community.slug
                  }
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
        ))}
      </div>
    </div>
  )
}
