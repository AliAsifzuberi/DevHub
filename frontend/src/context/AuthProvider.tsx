/**
 * Authentication provider — Phase 3 (real JWT).
 *
 * Purpose: hold the current user and expose login / register / logout.
 *
 * Flow:
 *   1. Login/register → POST /api/auth/... → accessToken + user
 *   2. Token kept in memory (apiClient) and mirrored to sessionStorage
 *   3. On reload → read token → GET /api/auth/me → restore user
 *
 * Still not production-hard: a stolen XSS can read sessionStorage. The next
 * hardening step is HttpOnly refresh cookies so the long-lived credential is
 * never visible to JavaScript. Access tokens stay short-lived either way.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  AuthContext,
  type AuthContextValue,
  type RegisterInput,
} from '@/context/authContext'
import { fetchMe, loginRequest, registerRequest } from '@/mocks/api'
import { setAccessToken, type ApiError } from '@/lib/apiClient'
import { queryClient } from '@/lib/queryClient'
import type { User } from '@/types'

const TOKEN_KEY = 'devhub.accessToken'

const messageFrom = (caught: unknown, fallback: string): string => {
  if (caught && typeof caught === 'object' && 'message' in caught) {
    return String((caught as ApiError).message || fallback)
  }
  if (caught instanceof Error) return caught.message
  return fallback
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const restore = async () => {
      const stored = sessionStorage.getItem(TOKEN_KEY)
      if (!stored) {
        setIsBootstrapping(false)
        return
      }
      setAccessToken(stored)
      try {
        const me = await fetchMe()
        setUser(me)
      } catch {
        // Token expired or invalid — clear quietly.
        sessionStorage.removeItem(TOKEN_KEY)
        setAccessToken(null)
        setUser(null)
      } finally {
        setIsBootstrapping(false)
      }
    }
    void restore()
  }, [])

  const persistSession = (token: string, nextUser: User) => {
    setAccessToken(token)
    sessionStorage.setItem(TOKEN_KEY, token)
    setUser(nextUser)
    // Drop cached feed/etc. so viewerVote / isMember refresh for this user.
    void queryClient.invalidateQueries()
  }

  const login = useCallback(async (username: string, password: string) => {
    setIsPending(true)
    setError(null)
    try {
      const result = await loginRequest(username, password)
      persistSession(result.accessToken, result.user)
    } catch (caught) {
      setError(messageFrom(caught, 'Login failed.'))
      throw caught
    } finally {
      setIsPending(false)
    }
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    setIsPending(true)
    setError(null)
    try {
      const result = await registerRequest({
        username: input.username,
        displayName: input.displayName,
        email: input.email,
        password: input.password,
      })
      persistSession(result.accessToken, result.user)
    } catch (caught) {
      setError(messageFrom(caught, 'Registration failed.'))
      throw caught
    } finally {
      setIsPending(false)
    }
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    setAccessToken(null)
    setUser(null)
    setError(null)
    void queryClient.clear()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isPending,
      isBootstrapping,
      error,
      login,
      register,
      logout,
    }),
    [user, isPending, isBootstrapping, error, login, register, logout],
  )

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-slate-500">
        Loading session…
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
