/**
 * Route guard for pages that require a signed-in user.
 *
 * Purpose: redirect anonymous visitors to the login page, and send them back
 * where they were trying to go once they succeed.
 *
 * A CRITICAL SECURITY CAVEAT
 * This is a **user experience** control, not a security boundary. Everything
 * here runs in the browser, where the user controls the runtime entirely —
 * anyone can open devtools and flip the condition, or simply call the API with
 * curl and skip the frontend altogether.
 *
 * Real authorisation must be enforced by the backend on every request. In
 * Phase 2 that means a FastAPI dependency that validates the JWT and rejects
 * the request with a 401 before any handler runs. This component exists so
 * that legitimate users are not shown a page that would fail — nothing more.
 * Treating client-side guards as security is one of the most consequential
 * mistakes in web development.
 *
 * Dependencies: React Router and the auth hook.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return (
      <Navigate
        to="/login"
        /**
         * `replace` swaps the current history entry rather than pushing a new
         * one. Without it the blocked URL stays in history, so pressing Back
         * after logging in returns the user to the guard, which bounces them
         * to login again — an inescapable loop.
         */
        replace
        /**
         * The attempted location travels along in router state so the login
         * page can return the user there afterwards. Dropping them on the home
         * page instead is a small papercut that is very noticeable when
         * someone opens a deep link from a notification.
         */
        state={{ from: location }}
      />
    )
  }

  return <Outlet />
}
