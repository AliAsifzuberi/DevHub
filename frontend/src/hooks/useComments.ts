/**
 * Mutation hooks for the comment tree.
 *
 * Purpose: adding a comment and voting on a comment, both keeping the cache
 * consistent afterwards.
 *
 * Dependencies: React Query and the API layer.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createComment, voteComment } from '@/mocks/api'
import { queryKeys } from '@/lib/queryClient'
import type { Comment, ID, VoteValue } from '@/types'

/**
 * Posting a comment.
 *
 * Note that this is *not* optimistic, unlike voting. The distinction is worth
 * understanding, because "optimistic everywhere" is a real anti-pattern.
 *
 * Optimism is appropriate when the operation almost always succeeds, the
 * result is predictable, and being briefly wrong is cheap. A vote qualifies on
 * all three. A comment fails the second test: the server assigns the ID and
 * the canonical timestamp, and it may reject the content for length or spam.
 * Rendering a comment that then disappears is far more jarring than waiting
 * 300ms for one that stays. The honest loading state is the better experience.
 */
export function useCreateComment(postId: ID) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { body: string; parentId: ID | null }) =>
      createComment({ postId, parentId: input.parentId, body: input.body }),

    onSuccess: () => {
      // Two caches are affected, and forgetting the second is a classic bug:
      // the comment appears, but the "12 comments" label above it still says
      // 11 until a hard refresh.
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments(postId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) })
    },
  })
}

/**
 * Recursively rebuilds the comment tree with one node's vote changed.
 *
 * This returns new objects rather than mutating in place. React decides
 * whether to re-render by comparing references, so mutating a cached comment
 * and handing back the same array would change the data without React ever
 * noticing — the classic "state updated but the screen did not" symptom.
 * Only the nodes on the path to the changed comment are recreated; untouched
 * branches keep their identity and skip re-rendering.
 */
const applyVoteToTree = (
  comments: Comment[],
  commentId: ID,
  value: VoteValue,
): Comment[] =>
  comments.map((comment) => {
    if (comment.id === commentId) {
      const nextVote: VoteValue = comment.viewerVote === value ? 0 : value
      return {
        ...comment,
        viewerVote: nextVote,
        score: comment.score + (nextVote - comment.viewerVote),
      }
    }
    if (comment.replies.length > 0) {
      return {
        ...comment,
        replies: applyVoteToTree(comment.replies, commentId, value),
      }
    }
    return comment
  })

export function useCommentVote(postId: ID) {
  const queryClient = useQueryClient()
  const key = queryKeys.comments(postId)

  return useMutation({
    mutationFn: (input: { commentId: ID; value: VoteValue }) =>
      voteComment(postId, input.commentId, input.value),

    // Comment votes are optimistic for the same reasons post votes are.
    onMutate: async ({ commentId, value }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const snapshot = queryClient.getQueryData<Comment[]>(key)

      queryClient.setQueryData<Comment[]>(key, (cached) =>
        cached ? applyVoteToTree(cached, commentId, value) : cached,
      )

      return { snapshot }
    },

    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(key, context.snapshot)
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
