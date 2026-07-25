/**
 * Messages for the two states that are easiest to forget: nothing here, and
 * something broke.
 *
 * Purpose: make sure every list in the application handles all four of its
 * possible states — loading, error, empty, and populated. Most bugs reported
 * as "the page is blank" are really a missing empty or error state, where the
 * component rendered successfully with nothing to show and gave the user no
 * explanation at all.
 *
 * Dependencies: the Button primitive.
 */
import type { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  title: string
  description?: string
  /** Optional call to action, e.g. "Create the first post". */
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {description && (
        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  /**
   * The message shown to the user. Keep it human. Rendering a raw exception
   * or a stack trace exposes internal details that are useless to the user and
   * occasionally useful to an attacker.
   */
  message: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    /**
     * `role="alert"` makes assistive technology announce this immediately when
     * it appears, rather than waiting for the user to navigate to it. Errors
     * are one of the few cases where interrupting is the right behaviour.
     */
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center"
    >
      <h2 className="text-base font-semibold text-red-900">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-red-700">{message}</p>
      {onRetry && (
        <div className="mt-5 flex justify-center">
          {/*
            Offering a retry matters because most failures here are transient —
            a dropped connection or a backend restart. Forcing a full page
            reload to recover from a blip is a poor experience, and it throws
            away all the cached data React Query is holding.
          */}
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}
