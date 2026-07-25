/**
 * Right-hand sidebar: community discovery and an about panel.
 *
 * Purpose: give users somewhere to go next. A feed with no navigation out of
 * it is a dead end — this is where community discovery lives.
 *
 * Dependencies: React Query, React Router, and the UI primitives.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { LinkButton } from '@/components/ui/LinkButton'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchCommunities } from '@/mocks/api'
import { queryKeys } from '@/lib/queryClient'
import { formatCompactNumber } from '@/lib/format'

export function Sidebar() {
  const { data: communities, isLoading } = useQuery({
    queryKey: queryKeys.communities(),
    queryFn: fetchCommunities,
  })

  return (
    /**
     * `sticky` with an explicit top offset that clears the 3.5rem header.
     * Without the offset the panel would slide underneath it. `hidden lg:block`
     * removes the sidebar entirely on narrow screens rather than stacking it
     * below the feed, where nobody scrolls far enough to see it.
     */
    <aside className="hidden w-80 shrink-0 lg:block">
      <div className="sticky top-[4.5rem] space-y-4">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Popular communities
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex items-center gap-2.5">
                  <Skeleton className="size-6 rounded-full" />
                  <Skeleton className="h-3 flex-1" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {communities?.slice(0, 5).map((community) => (
                <li key={community.id}>
                  <Link
                    to={`/c/${community.slug}`}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50"
                  >
                    <Avatar
                      name={community.name}
                      color={community.accentColor}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        c/{community.slug}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {formatCompactNumber(community.memberCount)} members
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-slate-100 p-3">
            <LinkButton
              to="/communities"
              variant="secondary"
              size="sm"
              className="w-full"
            >
              Browse all communities
            </LinkButton>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-800">About DevHub</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            A community for engineers to discuss the systems they build, the
            outages they survive, and the trade-offs in between.
          </p>
          <LinkButton to="/submit" size="sm" className="mt-3 w-full">
            Create a post
          </LinkButton>
        </Card>
      </div>
    </aside>
  )
}
