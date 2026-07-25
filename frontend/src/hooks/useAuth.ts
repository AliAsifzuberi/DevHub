/**
 * Hook for reading authentication state.
 *
 * Purpose: give components a safe, ergonomic way to access the auth context
 * without each of them repeating the null check.
 *
 * Dependencies: the auth context object.
 */
import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '@/context/authContext'

/**
 * Returns the current auth state, throwing if used outside `<AuthProvider>`.
 *
 * The throw is the whole point of wrapping `useContext` in a custom hook. It
 * converts a confusing runtime symptom ("why is user always null?") into an
 * immediate, explicit error naming the exact problem. It also narrows the
 * return type from `AuthContextValue | null` to `AuthContextValue`, so every
 * consumer is spared an optional-chaining dance the provider already
 * guarantees is unnecessary.
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return context
}
