/**
 * Login page.
 *
 * Purpose: authenticate against the real API and return the user to wherever
 * they were headed. Seed account: maya_builds / password123
 */
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'

interface LocationState {
  from?: { pathname: string }
}

export function LoginPage() {
  const { login, isPending, error } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  /** Set by `ProtectedRoute`; defaults to home for a direct visit. */
  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await login(username, password)
      // `replace` keeps the login page out of history, so Back does not
      // return a signed-in user to a form they no longer need.
      navigate(redirectTo, { replace: true })
    } catch {
      // The provider already stored the message in `error`; swallowing the
      // rejection here just prevents an unhandled promise warning.
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <Card className="p-6">
        <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">
          Log in to vote, comment, and post.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              /**
               * `htmlFor` must match the input's `id`. This is what lets a
               * click on the label focus the field, and what tells a screen
               * reader which text describes it. A bare <p> above an input
               * looks identical and provides neither.
               */
              htmlFor="username"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="maya_builds"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              /**
               * `current-password` lets password managers offer the saved
               * credential. Getting these autocomplete tokens right is a real
               * usability win and costs one attribute.
               */
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="password123"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" isLoading={isPending} className="w-full">
            Log in
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Need an account?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  )
}
