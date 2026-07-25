/**
 * Reads and validates the feed sort order from the URL query string.
 *
 * Purpose: keep "how is this feed ordered" in the address bar rather than in
 * component state.
 *
 * WHY THE URL AND NOT useState
 * The sort could live in a `useState`. Putting it in the query string instead
 * buys three things for free:
 *   - The view is shareable. `/?sort=top` shows a friend exactly what you see.
 *   - The back button works, because each change is a navigation.
 *   - A refresh preserves the choice instead of silently reverting.
 *
 * The rule of thumb: if a piece of state describes *what the user is looking
 * at*, it belongs in the URL. If it describes *how a widget is behaving right
 * now* — whether a dropdown is open — it belongs in component state.
 *
 * This lives apart from the `SortTabs` component so that the component file
 * exports only components, which is what Vite's Fast Refresh needs in order to
 * hot-reload while preserving state.
 *
 * Dependencies: React Router's `useSearchParams`.
 */
import { useSearchParams } from 'react-router-dom'
import type { FeedSort } from '@/mocks/api'

export const SORT_OPTIONS: Array<{
  value: FeedSort
  label: string
  hint: string
}> = [
  { value: 'hot', label: 'Hot', hint: 'Trending right now' },
  { value: 'new', label: 'New', hint: 'Most recent first' },
  { value: 'top', label: 'Top', hint: 'Highest score' },
]

export const DEFAULT_SORT: FeedSort = 'hot'

/**
 * Returns the active sort, falling back to the default for anything invalid.
 *
 * The validation is not optional. A user can type `?sort=banana` into the
 * address bar, and without this check that string would be handed straight to
 * the API. Treat every value that came from the URL as untrusted input — it is
 * the same reflex that prevents SQL injection on the backend, applied to a
 * lower-stakes case so the habit is already there when it matters.
 */
export const useFeedSort = (): FeedSort => {
  const [searchParams] = useSearchParams()
  const raw = searchParams.get('sort')
  const isValid = SORT_OPTIONS.some((option) => option.value === raw)
  return isValid ? (raw as FeedSort) : DEFAULT_SORT
}
