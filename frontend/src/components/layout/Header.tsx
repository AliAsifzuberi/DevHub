/**
 * Global application header.
 *
 * Purpose: persistent branding, primary navigation, and the account controls
 * that switch between the signed-in and anonymous experience.
 *
 * Dependencies: React Router, the auth hook, and the UI primitives.
 */
import { useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { LinkButton } from '@/components/ui/LinkButton'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { useAuth } from '@/hooks/useAuth'
import { useOnClickOutside } from '@/hooks/useOnClickOutside'
import { cn } from '@/lib/format'

/**
 * `NavLink` differs from `Link` by exposing an `isActive` flag, which is how
 * the current section gets highlighted. Deriving that from `useLocation` and
 * comparing strings by hand is the common alternative and it goes wrong on
 * nested routes and trailing slashes.
 */
function HeaderNavLink({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )
      }
    >
      {children}
    </NavLink>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useOnClickOutside(menuRef, () => setIsOpen(false), isOpen)

  if (!user) return null

  const handleLogout = () => {
    setIsOpen(false)
    logout()
    // Send the user home after signing out. Staying on a page that assumed a
    // logged-in user leaves them looking at a view they no longer have access
    // to, which is confusing at best and a data leak at worst.
    navigate('/')
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-slate-100"
        aria-expanded={isOpen}
        aria-label="Account menu"
      >
        <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
        <span className="hidden text-sm font-medium text-slate-700 sm:inline">
          {user.username}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <Link
            to={`/u/${user.username}`}
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            My profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

export function Header() {
  const { user } = useAuth()

  return (
    /**
     * `sticky top-0` keeps navigation reachable without scrolling back up.
     * The z-index must exceed the dropdowns' stacking context, or an open menu
     * would render above the header it belongs to when the page scrolls.
     */
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
            D
          </span>
          <span className="hidden sm:inline">DevHub</span>
        </Link>

        <nav className="ml-2 flex items-center gap-1">
          <HeaderNavLink to="/">Home</HeaderNavLink>
          <HeaderNavLink to="/communities">Communities</HeaderNavLink>
        </nav>

        {/* Pushes everything after it to the right edge. */}
        <div className="flex-1" />

        {user ? (
          <div className="flex items-center gap-1.5">
            <LinkButton to="/submit" size="sm" className="hidden sm:inline-flex">
              Create post
            </LinkButton>
            <NotificationBell />
            <UserMenu />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <LinkButton to="/login" variant="ghost" size="sm">
              Log in
            </LinkButton>
            <LinkButton to="/register" size="sm">
              Sign up
            </LinkButton>
          </div>
        )}
      </div>
    </header>
  )
}
