/**
 * Authentication provider.
 *
 * Purpose: hold the current user in one place and expose login / register /
 * logout to the whole component tree.
 *
 * PHASE 1 SCOPE — READ THIS BEFORE TRUSTING IT
 * This implementation is a simulation. It accepts any password, stores nothing
 * securely, and performs no verification whatsoever. That is acceptable only
 * because there is no backend yet and no real data to protect. What it *does*
 * do is establish the correct component-level contract — loading states, error
 * states, and a user object that may be null — so that Phase 3 can replace the
 * internals with real JWT calls without touching a single consuming component.
 *
 * The security work that Phase 3 must add:
 *   - Passwords verified server-side against an Argon2 or bcrypt hash. Hashing
 *     must never happen in the browser: the hash would simply become the
 *     password, and an attacker who intercepts it can replay it directly.
 *   - A short-lived access token (minutes) held in memory only.
 *   - A long-lived refresh token in an HttpOnly, Secure, SameSite cookie, so
 *     that JavaScript — including any injected by an XSS attack — cannot read
 *     it.
 *   - Server-side rate limiting on login, backed by Redis, to make credential
 *     stuffing impractical.
 *
 * Dependencies: React, the auth context, and the mock user data.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '@/context/authContext'
import { currentUser, users } from '@/mocks/data'
import type { User } from '@/types'

/**
 * Key under which the mock session is remembered across page reloads.
 *
 * Storing a username in localStorage is fine here precisely because it is not
 * a credential — it grants no access and proves nothing. A real access token
 * would be a very different matter, which is why Phase 3 keeps tokens in
 * memory instead. The prefix keeps the key from colliding with anything else
 * on the same origin.
 */
const SESSION_KEY = 'devhub.mockSession'

const findUserByUsername = (username: string): User | undefined =>
  Object.values(users).find(
    (candidate) => candidate.username.toLowerCase() === username.toLowerCase(),
  )

/** Restores the mock session on first render so a refresh does not log you out. */
const readStoredUser = (): User | null => {
  const stored = localStorage.getItem(SESSION_KEY)
  if (!stored) return null
  return findUserByUsername(stored) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  /**
   * The lazy initialiser form — `useState(() => ...)` rather than
   * `useState(readStoredUser())` — matters here. The second form calls
   * localStorage on *every* render and throws the result away; the first calls
   * it once on mount. With a cheap function the difference is negligible, but
   * it is a habit worth forming before it is applied to something expensive.
   */
  const [user, setUser] = useState<User | null>(readStoredUser)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (username: string, _password: string) => {
    setIsPending(true)
    setError(null)
    try {
      // Simulated round trip so the form's disabled/loading state is real.
      await new Promise((resolve) => setTimeout(resolve, 500))

      const found = findUserByUsername(username)
      if (!found) {
        /**
         * Note the deliberately vague message. A real login endpoint must
         * never reveal whether the username exists — "no such user" versus
         * "wrong password" hands an attacker a free account-enumeration
         * oracle, letting them build a list of valid usernames to target.
         * The habit starts here even though this is a mock.
         */
        throw new Error('Incorrect username or password.')
      }

      localStorage.setItem(SESSION_KEY, found.username)
      setUser(found)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed.')
      throw caught
    } finally {
      // `finally` guarantees the spinner stops even when the request throws.
      // Forgetting this is how forms end up permanently stuck in a loading
      // state after the first error.
      setIsPending(false)
    }
  }, [])

  const register = useCallback(
    async (username: string, displayName: string, _password: string) => {
      setIsPending(true)
      setError(null)
      try {
        await new Promise((resolve) => setTimeout(resolve, 600))

        if (findUserByUsername(username)) {
          throw new Error('That username is already taken.')
        }

        const created: User = {
          ...currentUser,
          id: `u_${crypto.randomUUID().slice(0, 8)}`,
          username,
          displayName: displayName || username,
          bio: null,
          karma: 1,
          createdAt: new Date().toISOString(),
        }

        // Registering adds the account to the in-memory store so that logging
        // out and back in during the same session works as a user would expect.
        users[username] = created
        localStorage.setItem(SESSION_KEY, created.username)
        setUser(created)
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : 'Registration failed.',
        )
        throw caught
      } finally {
        setIsPending(false)
      }
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
    setError(null)
  }, [])

  /**
   * The context value is memoised because an object literal is a new reference
   * on every render. Without `useMemo`, every consumer of this context would
   * re-render whenever *any* state in this provider changed — and since this
   * provider wraps the entire application, that is a meaningful cost for no
   * benefit.
   */
  const value = useMemo<AuthContextValue>(
    () => ({ user, isPending, error, login, register, logout }),
    [user, isPending, error, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
