/**
 * Loading placeholders.
 *
 * Purpose: occupy the space that content will fill, so the page does not jump
 * when data arrives.
 *
 * Why skeletons rather than a centred spinner?
 * A spinner communicates "something is happening" but nothing about what.
 * A skeleton communicates the shape of what is coming, which makes the wait
 * feel shorter, and — more concretely — it reserves the layout. Content that
 * appears and shoves everything downward is called cumulative layout shift; it
 * is measured by Google as a Core Web Vital and is genuinely irritating when
 * you are mid-click.
 *
 * Dependencies: the `cn` class helper.
 */
import { cn } from '@/lib/format'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-200', className)}
      aria-hidden="true"
    />
  )
}

/**
 * A skeleton shaped like a `PostCard`.
 *
 * Kept next to the generic `Skeleton` rather than inside `PostCard` so that
 * the loading and loaded shapes can be compared side by side when either is
 * adjusted — they drift apart otherwise.
 */
export function PostCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="size-6" />
        <Skeleton className="h-4 w-8" />
        <Skeleton className="size-6" />
      </div>
      <div className="flex-1 space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

/**
 * `role="status"` announces to screen readers that this region updates, and
 * the visually hidden text gives them something meaningful to read — a set of
 * grey rectangles conveys nothing without it. The `sr-only` utility hides the
 * text visually while keeping it in the accessibility tree, which is the
 * correct way to do this; `display: none` would hide it from both.
 */
export function PostListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">Loading posts</span>
      {Array.from({ length: count }, (_, index) => (
        <PostCardSkeleton key={index} />
      ))}
    </div>
  )
}
