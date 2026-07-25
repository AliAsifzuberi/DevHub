/**
 * A user's public profile and their posts.
 *
 * Purpose: give every `u/username` link somewhere meaningful to land.
 *
 * Note that this renders only public information — display name, bio, karma,
 * join date. Email and anything else private is absent from the `User` type
 * entirely, so it is a compile-time impossibility to leak it here. Designing
 * the type to exclude private fields is far more reliable than remembering not
 * to render them.
 *
 * Dependencies: React Router, React Query, and the UI components.
 */
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { PostList } from '@/components/post/PostList'
import { fetchUser, fetchUserPosts } from '@/mocks/api'
import { queryKeys } from '@/lib/queryClient'
import { formatCompactNumber, formatRelativeTime } from '@/lib/format'

export function ProfilePage() {
  const { username } = useParams<{ username: string }>()

  const userQuery = useQuery({
    queryKey: queryKeys.user(username ?? ''),
    queryFn: () => fetchUser(username!),
    enabled: Boolean(username),
  })

  const postsQuery = useQuery({
    queryKey: queryKeys.userPosts(username ?? ''),
    queryFn: () => fetchUserPosts(username!),
    enabled: Boolean(username),
  })

  if (userQuery.isLoading) {
    return <Skeleton className="h-32 rounded-xl" />
  }

  if (userQuery.error || !userQuery.data) {
    return (
      <ErrorState
        title="User not found"
        message={`There is no account with the username ${username}.`}
      />
    )
  }

  const user = userQuery.data

  return (
    <div>
      <Card className="mb-4 p-5">
        <div className="flex items-start gap-4">
          <Avatar name={user.displayName} src={user.avatarUrl} size="lg" />

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900">
              {user.displayName}
            </h1>
            <p className="text-sm text-slate-500">u/{user.username}</p>

            {user.bio && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {user.bio}
              </p>
            )}

            <dl className="mt-3 flex gap-6 text-sm">
              {/*
                A description list is the semantically correct element for
                label/value pairs. Divs would look identical and tell assistive
                technology nothing about the relationship between them.
              */}
              <div>
                <dt className="text-xs text-slate-400">Karma</dt>
                <dd className="font-semibold text-slate-800">
                  {formatCompactNumber(user.karma)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Joined</dt>
                <dd className="font-semibold text-slate-800">
                  {formatRelativeTime(user.createdAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      <h2 className="mb-3 text-base font-semibold text-slate-800">Posts</h2>

      <PostList
        posts={postsQuery.data}
        isLoading={postsQuery.isLoading}
        error={postsQuery.error}
        onRetry={() => void postsQuery.refetch()}
        emptyTitle={`u/${user.username} has not posted yet`}
        emptyDescription="When they start a discussion, it will show up here."
      />
    </div>
  )
}
