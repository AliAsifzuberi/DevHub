/**
 * Renders a collection of posts, handling every state a list can be in.
 *
 * Purpose: guarantee that loading, error, empty, and populated are all covered
 * in one place, so no page can accidentally omit one.
 *
 * This is the payoff of centralising state handling. Three pages render feeds
 * (home, community, profile). Without this component each would reimplement
 * the same four branches, and one of them would eventually be missing an empty
 * state — which is exactly how "the page is just blank" bugs reach production.
 *
 * Dependencies: the post card and the shared state components.
 */
import type { ReactNode } from 'react'
import { PostCard } from '@/components/post/PostCard'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { PostListSkeleton } from '@/components/ui/Skeleton'
import type { Post } from '@/types'

interface PostListProps {
  posts: Post[] | undefined
  isLoading: boolean
  error: Error | null
  onRetry?: () => void
  hideCommunity?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
}

export function PostList({
  posts,
  isLoading,
  error,
  onRetry,
  hideCommunity = false,
  emptyTitle = 'No posts yet',
  emptyDescription = 'Be the first to start a discussion here.',
  emptyAction,
}: PostListProps) {
  /**
   * The order of these checks matters. Loading is tested first because during
   * the initial fetch `posts` is undefined — and an `undefined` check that ran
   * first would render the empty state for a moment before the data arrives,
   * producing a visible "No posts yet" flash on every page load.
   */
  if (isLoading) return <PostListSkeleton />

  if (error) {
    return (
      <ErrorState
        message={error.message || 'We could not load these posts.'}
        onRetry={onRetry}
      />
    )
  }

  if (!posts || posts.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        /*
          Keyed by the stable post ID, never by array index. With an index key,
          inserting a new post at the top makes React believe every existing
          post changed content, so it rebuilds all of them — losing focus and
          scroll position, and defeating the reconciliation it is meant to help.
        */
        <PostCard key={post.id} post={post} hideCommunity={hideCommunity} />
      ))}
    </div>
  )
}
