/**
 * Textarea for writing a comment or a reply.
 *
 * Purpose: one form used both at the top of a thread and inline under any
 * comment being replied to.
 *
 * Dependencies: the auth hook (to require a signed-in user) and the Button
 * primitive.
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

interface CommentFormProps {
  onSubmit: (body: string) => Promise<unknown>
  isPending: boolean
  placeholder?: string
  submitLabel?: string
  onCancel?: () => void
  autoFocus?: boolean
}

/**
 * Matches the limit the backend will enforce in Phase 2.
 *
 * Client-side validation is a convenience, never a security control. It is
 * trivially bypassed with curl, so the server must apply the identical rule
 * independently. What it buys is a fast, clear error instead of a wasted round
 * trip — and the numbers must be kept in sync, or users hit a server error the
 * form swore was fine.
 */
const MAX_LENGTH = 10_000

export function CommentForm({
  onSubmit,
  isPending,
  placeholder = 'Share your thoughts',
  submitLabel = 'Comment',
  onCancel,
  autoFocus = false,
}: CommentFormProps) {
  const { user } = useAuth()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-600">
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Log in
        </Link>{' '}
        to join the discussion.
      </div>
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    /**
     * Without this, the browser performs its default form submission: a full
     * page navigation that reloads the entire application and discards all
     * client state. In a single-page app this is essentially always wrong.
     */
    event.preventDefault()

    const trimmed = body.trim()
    if (!trimmed) {
      setError('Write something first.')
      return
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(`Comments are limited to ${MAX_LENGTH.toLocaleString()} characters.`)
      return
    }

    setError(null)
    try {
      await onSubmit(trimmed)
      // Only cleared after a successful submit. Wiping the textarea before the
      // request resolves would destroy the user's writing if it then failed.
      setBody('')
    } catch {
      setError('Your comment could not be posted. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        rows={4}
        autoFocus={autoFocus}
        disabled={isPending}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none disabled:opacity-60"
        aria-label={placeholder}
      />

      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" isLoading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
