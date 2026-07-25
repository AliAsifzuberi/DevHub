/**
 * A single post as it appears in a feed.
 *
 * Purpose: summarise a post — score, origin, title, preview, comment count —
 * and link through to the full discussion.
 *
 * Dependencies: React Router for navigation, the voting hook, and the UI
 * primitives.
 */
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { VoteControl } from '@/components/post/VoteControl'
import { usePostVote } from '@/hooks/usePostVote'
import { cn, formatAbsoluteTime, formatRelativeTime } from '@/lib/format'
import type { Post } from '@/types'

interface PostCardProps {
  post: Post
  /** Hides the community badge on pages where every post shares one. */
  hideCommunity?: boolean
}

/**
 * Trims the body to a preview length without cutting a word in half.
 *
 * Slicing at a fixed index produces "…connection poo" which looks like a
 * rendering fault. Backing up to the last space costs one extra line and looks
 * intentional.
 */
const excerpt = (body: string, maxLength = 220): string => {
  const collapsed = body.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= maxLength) return collapsed
  const cut = collapsed.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`
}

export function PostCard({ post, hideCommunity = false }: PostCardProps) {
  const vote = usePostVote()

  return (
    <Card interactive className="flex gap-3 p-4">
      {/*
        The vote column sits outside the link. Nesting an interactive button
        inside an anchor is invalid HTML and behaves unpredictably: clicking
        the button can also trigger navigation, so users vote and get yanked
        to another page. Keeping them siblings avoids the problem entirely
        rather than patching it with stopPropagation.
      */}
      <div className="pt-0.5">
        <VoteControl
          score={post.score}
          viewerVote={post.viewerVote}
          disabled={vote.isPending}
          onVote={(value) => vote.mutate({ id: post.id, value })}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          {!hideCommunity && (
            <>
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
            </>
          )}

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

          {/*
            <time> carries a machine-readable dateTime, and the title shows the
            exact timestamp on hover. "5 hours ago" is friendlier to read;
            the precise value is one hover away when it actually matters.
          */}
          <time dateTime={post.createdAt} title={formatAbsoluteTime(post.createdAt)}>
            {formatRelativeTime(post.createdAt)}
          </time>
        </div>

        <h2 className="mt-1.5 text-lg leading-snug font-semibold text-slate-900">
          <Link to={`/posts/${post.id}`} className="hover:text-brand-700">
            {post.title}
          </Link>
        </h2>

        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          {excerpt(post.body)}
        </p>

        <div className="mt-3 flex items-center gap-4 text-xs font-medium text-slate-500">
          <Link
            to={`/posts/${post.id}`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-1 -ml-2',
              'hover:bg-slate-100 hover:text-slate-700',
            )}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
              <path d="M10 2c4.4 0 8 2.9 8 6.5S14.4 15 10 15c-.9 0-1.8-.1-2.6-.4L3 16l1.2-3.1C2.8 11.8 2 10.2 2 8.5 2 4.9 5.6 2 10 2z" />
            </svg>
            {post.commentCount}{' '}
            {/* Pluralisation is easy to get wrong and looks careless: "1 comments". */}
            {post.commentCount === 1 ? 'comment' : 'comments'}
          </Link>
        </div>
      </div>
    </Card>
  )
}
