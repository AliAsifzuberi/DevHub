/**
 * Feed ordering control (Hot / New / Top).
 *
 * Purpose: let the user change the sort order, writing the choice to the URL.
 *
 * The reasoning behind storing sort in the URL rather than in component state
 * lives in `hooks/useFeedSort.ts`, alongside the hook that reads it.
 *
 * Dependencies: React Router, the feed-sort hook, and the `cn` helper.
 */
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/format'
import { DEFAULT_SORT, SORT_OPTIONS, useFeedSort } from '@/hooks/useFeedSort'
import type { FeedSort } from '@/mocks/api'

export function SortTabs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const active = useFeedSort()

  const handleSelect = (value: FeedSort) => {
    /**
     * A new URLSearchParams is constructed from the existing one rather than
     * replacing it outright, so any unrelated parameters already in the URL
     * survive the change. Overwriting the whole query string is an easy way to
     * silently drop state that another feature depends on.
     */
    const next = new URLSearchParams(searchParams)

    if (value === DEFAULT_SORT) {
      // Omit the default so the canonical home URL stays a clean `/`.
      next.delete('sort')
    } else {
      next.set('sort', value)
    }

    /**
     * `replace: true` swaps the current history entry instead of adding one.
     * Without it, toggling between sorts three times means pressing Back three
     * times to leave the page, which feels broken.
     */
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="mb-4 flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleSelect(option.value)}
          title={option.hint}
          aria-current={active === option.value ? 'page' : undefined}
          className={cn(
            'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
            active === option.value
              ? 'bg-brand-600 text-white'
              : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
