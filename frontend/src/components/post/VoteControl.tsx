/**
 * Upvote / downvote control, shared by posts and comments.
 *
 * Purpose: render the current score and let the user change their vote.
 *
 * This component is deliberately **presentational**: it holds no state and
 * performs no network calls. It receives the score and the viewer's current
 * vote as props, and reports intent upward through `onVote`. The parent owns
 * the mutation.
 *
 * That split is what makes it reusable across two entirely different entities
 * — a post vote hits a different endpoint from a comment vote — without a
 * single conditional inside the component. It also makes it trivial to test:
 * render it with props, click, assert the callback fired. A component that
 * fetches internally can only be tested by mocking the network.
 *
 * Dependencies: the domain types and the formatting helpers.
 */
import type { VoteValue } from '@/types'
import { cn, formatCompactNumber } from '@/lib/format'

interface VoteControlProps {
  score: number
  viewerVote: VoteValue
  /**
   * Called with the arrow the user pressed (1 or -1), never with 0. Whether
   * that press means "apply" or "undo" is the parent's business, because only
   * the parent knows how to persist it.
   */
  onVote: (value: VoteValue) => void
  orientation?: 'vertical' | 'horizontal'
  disabled?: boolean
}

function ArrowIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn('size-4', direction === 'down' && 'rotate-180')}
      aria-hidden="true"
    >
      <path d="M10 3.5 17.5 12h-4.2v4.5H6.7V12H2.5z" />
    </svg>
  )
}

export function VoteControl({
  score,
  viewerVote,
  onVote,
  orientation = 'vertical',
  disabled = false,
}: VoteControlProps) {
  const isVertical = orientation === 'vertical'

  const buttonClasses = (direction: VoteValue) =>
    cn(
      'rounded p-1 transition-colors',
      'disabled:cursor-not-allowed disabled:opacity-50',
      // Only the currently selected arrow is coloured. Colouring both would
      // remove the single most important piece of information this control
      // conveys: what the user already did.
      viewerVote === direction
        ? direction === 1
          ? 'text-upvote bg-orange-50'
          : 'text-downvote bg-indigo-50'
        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
    )

  return (
    <div
      className={cn(
        'flex items-center',
        isVertical ? 'flex-col gap-0.5' : 'flex-row gap-1',
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote(1)}
        className={buttonClasses(1)}
        /**
         * `aria-pressed` turns this into a toggle button for assistive
         * technology, so it is announced as "Upvote, pressed" rather than just
         * "Upvote". Without it, a screen reader user cannot tell whether their
         * vote registered — the colour change that sighted users rely on is
         * invisible to them.
         */
        aria-pressed={viewerVote === 1}
        aria-label="Upvote"
      >
        <ArrowIcon direction="up" />
      </button>

      <span
        className={cn(
          'text-xs font-semibold tabular-nums',
          viewerVote === 1
            ? 'text-upvote'
            : viewerVote === -1
              ? 'text-downvote'
              : 'text-slate-700',
        )}
        /**
         * `tabular-nums` above forces fixed-width digits. Without it, the
         * score's width changes as digits change, and the arrows visibly shift
         * sideways every time someone votes.
         */
        title={`${score} points`}
      >
        {formatCompactNumber(score)}
      </span>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote(-1)}
        className={buttonClasses(-1)}
        aria-pressed={viewerVote === -1}
        aria-label="Downvote"
      >
        <ArrowIcon direction="down" />
      </button>
    </div>
  )
}
