/**
 * A single post with its full body and comment thread.
 *
 * Purpose: the destination of nearly every link in the application.
 *
 * Dependencies: React Router, React Query, the vote hook, and the comment
 * thread.
 */
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { VoteControl } from '@/components/post/VoteControl'
import { CommentThread } from '@/components/comment/CommentThread'
import { usePostVote } from '@/hooks/usePostVote'
import { fetchPost } from '@/mocks/api'
import { queryKeys } from '@/lib/queryClient'
import { formatAbsoluteTime, formatRelativeTime } from '@/lib/format'

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const vote = usePostVote()

  const { data: post, isLoading, error } = useQuery({
    queryKey: queryKeys.post(postId ?? ''),
    queryFn: () => fetchPost(postId!),
    enabled: Boolean(postId),
  })

  if (isLoading) {
    return (
      <Card className="space-y-3 p-5">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </Card>
    )
  }

  if (error || !post) {
    return (
      <ErrorState
        title="Post not found"
        message="This post may have been deleted, or the link may be wrong."
      />
    )
  }

  return (
    <article>
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <Link
            to={`/c/${post.community.slug}`}
            className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-brand-600"
          >
            <Avatar
              name={post.community.name}
              color={post.community.accentColor}
              size="sm"
            />
            c/{post.community.slug}
          </Link>
          <span aria-hidden="true">·</span>
          <span>
            posted by{' '}
            <Link
              to={`/u/${post.author.username}`}
              className="hover:text-brand-600 hover:underline"
            >
              u/{post.author.username}
            </Link>
          </span>
          <span aria-hidden="true">·</span>
          <time
            dateTime={post.createdAt}
            title={formatAbsoluteTime(post.createdAt)}
          >
            {formatRelativeTime(post.createdAt)}
          </time>
        </div>

        <h1 className="mt-2 text-2xl leading-tight font-bold text-slate-900">
          {post.title}
        </h1>

        {/*
          `whitespace-pre-line` renders the author's line breaks while keeping
          the content as text. As in comments, this is a security decision as
          much as a formatting one — React escapes the string, so nothing a
          user typed can execute as markup.
        */}
        <div className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-slate-700">
          {post.body}
        </div>

        <div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-3">
          <VoteControl
            orientation="horizontal"
            score={post.score}
            viewerVote={post.viewerVote}
            disabled={vote.isPending}
            onVote={(value) => vote.mutate({ id: post.id, value })}
          />
          <span className="text-xs font-medium text-slate-500">
            {post.commentCount}{' '}
            {post.commentCount === 1 ? 'comment' : 'comments'}
          </span>
        </div>
      </Card>

      <CommentThread postId={post.id} />
    </article>
  )
}
