/**
 * Join / leave a community.
 *
 * Purpose: toggle membership and keep every cached view of that community in
 * agreement afterwards.
 *
 * Dependencies: React Query and the API layer.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toggleCommunityMembership } from '@/mocks/api'

export function useCommunityMembership() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => toggleCommunityMembership(slug),

    onSuccess: () => {
      /**
       * Invalidating the `['communities']` prefix covers the browse list, the
       * sidebar, and the individual community page in one call, because React
       * Query matches keys by prefix.
       *
       * This is a deliberately blunt instrument. Surgically patching each
       * cache entry would avoid a refetch, but membership changes are rare —
       * a user clicks Join a handful of times, not hundreds — so the extra
       * request costs nothing measurable and the code stays obviously correct.
       * Optimise the hot path; keep the cold path simple.
       */
      void queryClient.invalidateQueries({ queryKey: ['communities'] })
    },
  })
}
