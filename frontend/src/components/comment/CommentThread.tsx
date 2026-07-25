/**
 * The full comment section for a post.
 *
 * Purpose: compose the "write a comment" box with the rendered tree, and
 * handle the loading, error, and empty states around them.
 *
 * This is the entry point into the recursion: it maps over the top-level
 * comments at depth 0, and `CommentItem` takes over from there.
 *
 * Dependencies: React Query for reading comments, plus the comment components.
 */
import { useQuery } from '@tanstack/react-query'
import { CommentForm } from '@/components/comment/CommentForm'
import { CommentItem } from '@/components/comment/CommentItem'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCreateComment } from '@/hooks/useComments'
import { fetchComments } from '@/mocks/api'
import { queryKeys } from '@/lib/queryClient'
import type { ID } from '@/types'

export function CommentThread({ postId }: { postId: ID }) {
  const {
    data: comments,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.comments(postId),
    queryFn: () => fetchComments(postId),
  })

  const createComment = useCreateComment(postId)

  return (
    <section className="mt-6" aria-label="Comments">
      <div className="mb-6">
        <CommentForm
          onSubmit={(body) => createComment.mutateAsync({ body, parentId: null })}
          isPending={createComment.isPending}
        />
      </div>

      {isLoading && (
        <div className="space-y-4" role="status" aria-live="polite">
          <span className="sr-only">Loading comments</span>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex gap-2.5">
              <Skeleton className="size-6 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <ErrorState
          message="We could not load the discussion."
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !error && comments?.length === 0 && (
        <EmptyState
          title="No comments yet"
          description="Start the conversation — the first reply usually sets the tone."
        />
      )}

      {comments && comments.length > 0 && (
        <div className="space-y-1">
          {comments.map((comment) => (
            /* depth starts at 0; CommentItem increments as it recurses. */
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              depth={0}
            />
          ))}
        </div>
      )}
    </section>
  )
}
