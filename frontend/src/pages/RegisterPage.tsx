/**
 * Registration page — creates an account via POST /api/auth/register.
 *
 * Client validation mirrors the backend rules. The server remains the real
 * authority; this layer only saves a round trip for honest typos.
 */
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/
const MIN_PASSWORD_LENGTH = 8

export function RegisterPage() {
  const { register, isPending, error } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!USERNAME_PATTERN.test(username)) {
      setValidationError(
        'Usernames must be 3-20 characters, using letters, numbers, or underscores.',
      )
      return
    }
    if (!email.includes('@') || email.length < 5) {
      setValidationError('Enter a valid email address.')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setValidationError(
        `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      )
      return
    }

    setValidationError(null)
    try {
      await register({ username, displayName, email, password })
      navigate('/', { replace: true })
    } catch {
      // Error already on the provider.
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <Card className="p-6">
        <h1 className="text-xl font-bold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Join the discussion in seconds.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="new-username"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Username
            </label>
            <input
              id="new-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="jordan_dev"
            />
          </div>

          <div>
            <label
              htmlFor="display-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Display name{' '}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="display-name"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="Jordan Ellis"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="jordan@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="new-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            />
          </div>

          {(validationError || error) && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {validationError ?? error}
            </p>
          )}

          <Button type="submit" isLoading={isPending} className="w-full">
            Create account
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-600 hover:underline"
          >
            Log in
          </Link>
        </p>
      </Card>
    </div>
  )
}
