/**
 * A single comment and, recursively, all of its replies.
 *
 * Purpose: render one node of the comment tree.
 *
 * THE RECURSION
 * This component renders `<CommentItem>` for each of its own replies. That is
 * the entire mechanism behind nested threads — the same twenty lines handle a
 * top-level comment and a reply eight levels down. The alternative, a set of
 * components for each depth, cannot work because the depth is unbounded.
 *
 * Recursion needs a base case or it never terminates. Here it is implicit and
 * worth naming: a comment whose `replies` array is empty renders no children,
 * and since the data is a tree rather than a graph, every branch reaches that
 * state. The database enforces this — a comment's `parent_id` always points at
 * an older comment, so a cycle cannot be created.
 *
 * INDENTATION HAS A LIMIT
 * Visual nesting stops at `MAX_INDENT_DEPTH` while the recursion continues.
 * Without a cap, a deep thread indents itself off the right edge of a phone
 * screen and becomes a column one word wide.
 *
 * Dependencies: React Router, the voting and comment hooks, and the UI
 * primitives.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { CommentForm } from '@/components/comment/CommentForm'
import { VoteControl } from '@/components/post/VoteControl'
import { useCommentVote, useCreateComment } from '@/hooks/useComments'
import { cn, formatAbsoluteTime, formatRelativeTime } from '@/lib/format'
import type { Comment, ID } from '@/types'

interface CommentItemProps {
  comment: Comment
  postId: ID
  depth: number
}

const MAX_INDENT_DEPTH = 5

/** Total nodes in a subtree, used for the "show N replies" label. */
const countReplies = (comment: Comment): number =>
  comment.replies.reduce((total, reply) => total + 1 + countReplies(reply), 0)

export function CommentItem({ comment, postId, depth }: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const vote = useCommentVote(postId)
  const createComment = useCreateComment(postId)

  const hiddenReplyCount = countReplies(comment)

  const handleReply = async (body: string) => {
    await createComment.mutateAsync({ body, parentId: comment.id })
    setIsReplying(false)
  }

  return (
    <article className="relative">
      <div className="flex gap-2.5">
        <div className="flex flex-col items-center">
          <Avatar name={comment.author.displayName} size="sm" />

          {/*
            The vertical rule beneath the avatar is a thread line: it visually
            connects a comment to its replies, which is what makes a deep
            conversation readable. It doubles as the collapse control, a
            pattern borrowed from Reddit because the target is large and sits
            exactly where the eye already is when scanning a thread.
          */}
          {!isCollapsed && comment.replies.length > 0 && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="group mt-1 flex flex-1 justify-center px-1.5"
              aria-label={`Collapse thread from ${comment.author.username}`}
            >
              <span className="w-px flex-1 bg-slate-200 transition-colors group-hover:bg-brand-400" />
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1 pb-3">
          <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
            <Link
              to={`/u/${comment.author.username}`}
              className="font-semibold text-slate-700 hover:text-brand-600 hover:underline"
            >
              u/{comment.author.username}
            </Link>
            <span aria-hidden="true">·</span>
            <time
              dateTime={comment.createdAt}
              title={formatAbsoluteTime(comment.createdAt)}
            >
              {formatRelativeTime(comment.createdAt)}
            </time>
          </div>

          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="mt-1 text-xs font-medium text-brand-600 hover:underline"
            >
              Show {hiddenReplyCount + 1}{' '}
              {hiddenReplyCount === 0 ? 'comment' : 'comments'}
            </button>
          ) : (
            <>
              {/*
                `whitespace-pre-line` preserves the author's paragraph breaks.
                Rendering as plain text rather than HTML is also the security
                decision here: React escapes interpolated strings by default,
                so a comment containing <script> is displayed, not executed.
                Reaching for dangerouslySetInnerHTML to support formatting is
                how stored XSS gets introduced — if we add Markdown later, it
                must be sanitised server-side first.
              */}
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-slate-700">
                {comment.body}
              </p>

              <div className="mt-1.5 flex items-center gap-3">
                <VoteControl
                  orientation="horizontal"
                  score={comment.score}
                  viewerVote={comment.viewerVote}
                  disabled={vote.isPending}
                  onVote={(value) =>
                    vote.mutate({ commentId: comment.id, value })
                  }
                />

                <button
                  type="button"
                  onClick={() => setIsReplying((open) => !open)}
                  className="rounded px-1.5 py-0.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-expanded={isReplying}
                >
                  Reply
                </button>
              </div>

              {isReplying && (
                <div className="mt-3">
                  <CommentForm
                    onSubmit={handleReply}
                    isPending={createComment.isPending}
                    placeholder={`Reply to ${comment.author.username}`}
                    submitLabel="Reply"
                    onCancel={() => setIsReplying(false)}
                    autoFocus
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!isCollapsed && comment.replies.length > 0 && (
        <div
          className={cn(
            // Indent only while under the cap; past it, replies stay aligned
            // with their parent and the thread line alone conveys nesting.
            depth < MAX_INDENT_DEPTH ? 'ml-4 sm:ml-6' : 'ml-0',
          )}
        >
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </article>
  )
}
