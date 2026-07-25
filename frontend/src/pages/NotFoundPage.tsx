/**
 * 404 page for URLs that match no route.
 *
 * Purpose: fail gracefully. Without a catch-all route, an unmatched URL
 * renders the layout with an empty main area — a blank page that looks like
 * the application crashed and gives the user no way forward.
 *
 * Dependencies: React Router and the UI primitives.
 */
import { LinkButton } from '@/components/ui/LinkButton'

export function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <h1 className="mt-3 text-xl font-bold text-slate-900">Page not found</h1>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
        The page you are looking for does not exist, or it may have been moved.
      </p>
      <div className="mt-6">
        <LinkButton to="/">Back to the feed</LinkButton>
      </div>
    </div>
  )
}
