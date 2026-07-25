/**
 * Notification bell with an unread badge and a dropdown panel.
 *
 * Purpose: surface activity on the user's posts and comments.
 *
 * PHASE 1 vs PHASE 4
 * Right now this polls a static list once. In Phase 4 the same component will
 * be fed by a WebSocket: the backend publishes to a Redis channel when a
 * comment, reply, or vote occurs, every server instance subscribed to that
 * channel receives it, and each pushes to its connected clients.
 *
 * Redis Pub/Sub is what makes that work across more than one server. On Cloud
 * Run there are many container instances, and the user who should receive a
 * notification is probably connected to a different instance from the one
 * handling the request that triggered it. Without a shared message bus, that
 * notification simply never arrives — a bug that is invisible in local
 * development, where there is only ever one instance.
 *
 * Dependencies: React Query, React Router, and the click-outside hook.
 */
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useOnClickOutside } from '@/hooks/useOnClickOutside'
import { fetchNotifications } from '@/mocks/api'
import { queryKeys } from '@/lib/queryClient'
import { cn, formatRelativeTime } from '@/lib/format'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(containerRef, () => setIsOpen(false), isOpen)

  const { data: notifications = [] } = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: fetchNotifications,
  })

  const unreadCount = notifications.filter((item) => !item.isRead).length

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        /**
         * `aria-expanded` tells assistive technology this control owns a
         * collapsible region and reports its current state. The label includes
         * the unread count because the badge is purely visual — a screen
         * reader user would otherwise hear "Notifications" and learn nothing.
         */
        aria-expanded={isOpen}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
          <path d="M10 2a5 5 0 0 0-5 5v3.6l-1.3 2.2a.8.8 0 0 0 .7 1.2h11.2a.8.8 0 0 0 .7-1.2L15 10.6V7a5 5 0 0 0-5-5zm0 16a2.5 2.5 0 0 0 2.4-1.8H7.6A2.5 2.5 0 0 0 10 18z" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-slate-800">Notifications</h2>
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              Nothing new right now.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    to={notification.link}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'block px-4 py-3 text-sm hover:bg-slate-50',
                      !notification.isRead && 'bg-brand-50/60',
                    )}
                  >
                    <p className="text-slate-700">{notification.message}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
