/**
 * Live notification WebSocket.
 *
 * Purpose: keep the React Query notifications cache fresh without polling.
 *
 * Flow:
 *   1. Browser opens WS to /api/ws/notifications?token=… (Vite proxies it)
 *   2. Backend accepts after JWT check and registers the socket for this user
 *   3. When someone comments on your post, that API process publishes to Redis
 *   4. Every API process subscribed to `user:*:notifications` receives it
 *   5. The process holding *your* socket pushes JSON down the wire
 *   6. This hook prepends the notification into the query cache
 *
 * Why Redis in the middle? On Cloud Run your WebSocket and the write request
 * usually land on different instances. Pub/Sub is the shared bus.
 */
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getAccessToken } from '@/lib/apiClient'
import { queryKeys } from '@/lib/queryClient'
import type { AppNotification } from '@/types'

export function useNotificationSocket(enabled: boolean): void {
  const queryClient = useQueryClient()
  const queryClientRef = useRef(queryClient)
  queryClientRef.current = queryClient

  useEffect(() => {
    if (!enabled) return

    const token = getAccessToken()
    if (!token) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url =
      `${protocol}//${window.location.host}/api/ws/notifications` +
      `?token=${encodeURIComponent(token)}`

    const socket = new WebSocket(url)

    socket.onmessage = (event: MessageEvent<string>) => {
      let notification: AppNotification
      try {
        notification = JSON.parse(event.data) as AppNotification
      } catch {
        return
      }

      queryClientRef.current.setQueryData<AppNotification[]>(
        queryKeys.notifications(),
        (previous = []) => {
          if (previous.some((item) => item.id === notification.id)) {
            return previous
          }
          return [notification, ...previous]
        },
      )
    }

    return () => {
      socket.close()
    }
  }, [enabled])
}
