/**
 * The authentication context object and its type.
 *
 * Purpose: define the shape of "who is logged in" that any component in the
 * tree can read, without threading a `user` prop through every intermediate
 * component (a pattern known as prop drilling).
 *
 * Why is this a separate file from the provider component?
 * Two reasons. First, Vite's Fast Refresh only preserves state when a module
 * exports components exclusively; mixing a context object into a component
 * file causes a full reload on every edit. Second, keeping the context here
 * means the hook and the provider can both import it without importing each
 * other, which avoids a circular dependency.
 */
import { createContext } from 'react'
import type { User } from '@/types'

export interface AuthContextValue {
  /** The signed-in user, or null when browsing anonymously. */
  user: User | null
  /** True while a login/register request is in flight. */
  isPending: boolean
  /** Populated when the last attempt failed, so forms can display it. */
  error: string | null
  login: (username: string, password: string) => Promise<void>
  register: (
    username: string,
    displayName: string,
    password: string,
  ) => Promise<void>
  logout: () => void
}

/**
 * The default value is `null`, not a stub object.
 *
 * This is deliberate: it lets the `useAuth` hook detect that a component is
 * being rendered outside the provider and throw a clear error. A stub default
 * would let that mistake through silently, and the component would just render
 * as though nobody were logged in — a bug that is genuinely hard to trace.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
