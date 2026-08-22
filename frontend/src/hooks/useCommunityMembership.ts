/**
 * Join / leave a community.
 *
 * The backend exposes POST (join) and DELETE (leave). The UI passes the
 * current membership so we know which verb to use — a true "toggle" endpoint
 * would hide that and make debugging harder.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toggleCommunityMembership } from '@/mocks/api'

interface MembershipVariables {
  slug: string
  isMember: boolean
}

export function useCommunityMembership() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ slug, isMember }: MembershipVariables) =>
      toggleCommunityMembership(slug, isMember),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['communities'] })
    },
  })
}
