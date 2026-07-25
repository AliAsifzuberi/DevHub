/**
 * Create-a-post page.
 *
 * Purpose: the application's primary write path.
 *
 * Sits behind `ProtectedRoute`, so `user` is guaranteed non-null by the time
 * this renders.
 *
 * Dependencies: React Router, React Query, and the UI primitives.
 */
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createPost, fetchCommunities } from '@/mocks/api'
import { queryKeys } from '@/lib/queryClient'

const MAX_TITLE_LENGTH = 300

export function SubmitPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const { data: communities } = useQuery({
    queryKey: queryKeys.communities(),
    queryFn: fetchCommunities,
  })

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  /**
   * Pre-selects a community when arriving from `/submit?community=devops`,
   * so the "Create a post" button on a community page carries context with it.
   */
  const [communitySlug, setCommunitySlug] = useState(
    searchParams.get('community') ?? '',
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: createPost,
    onSuccess: (post) => {
      // The new post belongs in the feed, so those caches are now stale.
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
      // Land the author on their post rather than back on the feed — it
      // confirms the write succeeded and is what they want to look at next.
      navigate(`/posts/${post.id}`)
    },
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (!communitySlug) {
      setValidationError('Choose a community for this post.')
      return
    }
    if (title.trim().length < 5) {
      setValidationError('Give your post a title of at least 5 characters.')
      return
    }
    if (title.length > MAX_TITLE_LENGTH) {
      setValidationError(`Titles are limited to ${MAX_TITLE_LENGTH} characters.`)
      return
    }

    setValidationError(null)
    mutation.mutate({ title, body, communitySlug })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-slate-900">Create a post</h1>

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="community"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Community
            </label>
            <select
              id="community"
              value={communitySlug}
              onChange={(event) => setCommunitySlug(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Select a community</option>
              {communities?.map((community) => (
                <option key={community.id} value={community.slug}>
                  c/{community.slug}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="title"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              /**
               * `maxLength` stops the input at the limit rather than letting
               * someone write 400 characters and only then be told. Pair it
               * with the live counter below so the limit is never a surprise.
               */
              maxLength={MAX_TITLE_LENGTH}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="What do you want to discuss?"
            />
            <p className="mt-1 text-right text-xs text-slate-400">
              {title.length}/{MAX_TITLE_LENGTH}
            </p>
          </div>

          <div>
            <label
              htmlFor="body"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Body{' '}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="body"
              rows={10}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="w-full resize-y rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed focus:border-brand-500 focus:outline-none"
              placeholder="Give some context. What did you try, and what happened?"
            />
          </div>

          {(validationError || mutation.error) && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {validationError ?? 'Your post could not be published. Try again.'}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              Publish
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
