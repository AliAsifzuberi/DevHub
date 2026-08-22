/**
 * The authentication context object and its type.
 *
 * Kept separate from AuthProvider so Fast Refresh and imports stay clean.
 */
import { createContext } from 'react'
import type { User } from '@/types'

export interface RegisterInput {
  username: string
  displayName: string
  email: string
  password: string
}

export interface AuthContextValue {
  user: User | null
  /** True while login/register is in flight. */
  isPending: boolean
  /** True on first load while we restore a session from sessionStorage. */
  isBootstrapping: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
