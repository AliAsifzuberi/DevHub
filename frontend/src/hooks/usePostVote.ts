/**
 * Mutation hook for voting on a post, with optimistic updates.
 *
 * Purpose: make a vote feel instant while still being correct if the server
 * rejects it.
 *
 * WHY OPTIMISTIC UPDATES
 * The naive approach is: send the request, wait, then update the UI. Even on a
 * fast connection that is 100-300ms of nothing happening after a click, and on
 * mobile it is far worse. For a high-frequency, low-stakes action like voting,
 * that delay makes the whole application feel sluggish.
 *
 * The optimistic approach inverts it: update the UI immediately, assuming
 * success, then reconcile with reality when the response lands. Votes are a
 * near-perfect fit because they almost always succeed and the cost of being
 * briefly wrong is a number being off by one for a moment.
 *
 * THE PART PEOPLE GET WRONG
 * An optimistic update is only safe if you can undo it. The full sequence is:
 *
 *   1. onMutate  - cancel in-flight refetches, snapshot the cache, apply the
 *                  change locally.
 *   2. onError   - restore the snapshot. Without this the UI keeps showing a
 *                  vote that never actually persisted, and the user only finds
 *                  out on the next page load.
 *   3. onSettled - invalidate, so the server's authoritative value wins
 *                  regardless of outcome.
 *
 * Step 1's cancellation is the subtle one. If a background refetch is already
 * in flight when the user votes, it can resolve *after* the optimistic write
 * and overwrite it with pre-vote data — the score visibly jumps back. Are you
 * cancelling first? Then that race cannot happen.
 *
 * Dependencies: React Query and the API layer.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { votePost } from '@/mocks/api'
import type { ID, Post, VoteValue } from '@/types'

interface VoteVariables {
  id: ID
  value: VoteValue
}

/**
 * Applies a vote to a single post object, returning a new object.
 *
 * The score delta is `nextVote - previousVote`, not simply +1 or -1. Consider
 * switching from a downvote to an upvote: the vote goes from -1 to 1, so the
 * score must move by 2. Hardcoding +1 there is the single most common voting
 * bug, and it only shows up for users who change their mind.
 */
const applyVote = (post: Post, value: VoteValue): Post => {
  const nextVote: VoteValue = post.viewerVote === value ? 0 : value
  return {
    ...post,
    viewerVote: nextVote,
    score: post.score + (nextVote - post.viewerVote),
  }
}

/**
 * Patches whichever cache shape we encounter.
 *
 * The same post is cached in two different forms: as one element of a `Post[]`
 * for the feed, and as a lone `Post` for the detail page. Both must be updated
 * or the score will disagree between the two views — a bug users notice
 * immediately when they vote in the feed and then open the post.
 */
const patchCache = (
  cached: unknown,
  id: ID,
  value: VoteValue,
): unknown => {
  if (Array.isArray(cached)) {
    return (cached as Post[]).map((post) =>
      post.id === id ? applyVote(post, value) : post,
    )
  }
  if (cached && typeof cached === 'object' && 'id' in cached) {
    const post = cached as Post
    return post.id === id ? applyVote(post, value) : post
  }
  return cached
}

export function usePostVote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, value }: VoteVariables) => votePost(id, value),

    onMutate: async ({ id, value }) => {
      // Stop any in-flight `posts` queries so they cannot land after our
      // optimistic write and clobber it.
      await queryClient.cancelQueries({ queryKey: ['posts'] })

      // Snapshot every matching cache entry so a failure can be undone
      // exactly. Matching by the `['posts']` prefix catches the feed, the
      // community feeds, and the detail view in one call.
      const snapshot = queryClient.getQueriesData({ queryKey: ['posts'] })

      queryClient.setQueriesData({ queryKey: ['posts'] }, (cached: unknown) =>
        patchCache(cached, id, value),
      )

      // Whatever is returned here becomes the `context` argument in onError.
      return { snapshot }
    },

    onError: (_error, _variables, context) => {
      context?.snapshot.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data)
      })
    },

    onSettled: () => {
      /**
       * Runs on both success and failure. Even when the optimistic guess was
       * right, refetching matters: other users have been voting too, so the
       * server's score is likely to differ from our locally computed one. The
       * optimistic value is a good-enough placeholder, never the truth.
       */
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}
