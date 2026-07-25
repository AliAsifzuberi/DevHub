/**
 * Surface container used for posts, sidebars, and forms.
 *
 * Purpose: define "a raised panel" exactly once. Border radius, border colour,
 * and background are the kind of values that drift by a pixel or a shade when
 * copied by hand, and inconsistent surfaces are immediately noticeable even to
 * users who could not say why the page looks untidy.
 *
 * Dependencies: the `cn` class helper.
 */
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/format'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a hover treatment. Only for cards that are genuinely clickable. */
  interactive?: boolean
  children: ReactNode
}

export function Card({
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white',
        // The hover state is opt-in rather than always on. A card that reacts
        // to the cursor implies it can be clicked; applying that to a static
        // panel is a small but real usability lie.
        interactive && 'transition-colors hover:border-slate-300',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
