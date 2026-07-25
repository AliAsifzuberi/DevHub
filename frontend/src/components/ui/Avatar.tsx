/**
 * User and community avatar.
 *
 * Purpose: render a profile image, falling back to a generated initial badge
 * when no image exists — which, in Phase 1, is always, since uploads do not
 * arrive until Cloud Storage in Phase 5.
 *
 * The interesting design decision is that the fallback colour is *derived from
 * the name* rather than random or fixed. A deterministic hash means the same
 * user is always the same colour, on every page and for every viewer. That
 * consistency is what makes an avatar useful for recognition at a glance;
 * a random colour per render would be actively worse than a grey box.
 *
 * Dependencies: the `cn` class helper.
 */
import { cn } from '@/lib/format'

type AvatarSize = 'sm' | 'md' | 'lg'

interface AvatarProps {
  name: string
  src?: string | null
  size?: AvatarSize
  /** Overrides the derived colour — used by communities, which store their own. */
  color?: string
  className?: string
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'size-6 text-[10px]',
  md: 'size-9 text-sm',
  lg: 'size-16 text-xl',
}

/** Palette used for derived colours; all chosen to pass contrast against white text. */
const FALLBACK_COLORS = [
  '#4f46e5',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
]

/**
 * Maps a string onto a palette index.
 *
 * This is the classic djb2-style string hash: multiply the running total by a
 * small prime and add each character code. It is not cryptographic and does
 * not need to be — the only requirement is that the same input reliably
 * produces the same output and that different inputs spread reasonably evenly
 * across the palette.
 *
 * `Math.abs` guards against integer overflow producing a negative value, which
 * would index off the front of the array and yield `undefined`.
 */
const colorForName = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + (hash << 5) - hash
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length]
}

export function Avatar({
  name,
  src,
  size = 'md',
  color,
  className,
}: AvatarProps) {
  const initial = name.charAt(0).toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        /**
         * The alt text is the name alone, without the word "avatar". Screen
         * readers already announce that this is an image, so including the
         * word would produce "image avatar of Maya Chen" — redundant padding
         * that slows navigation down.
         */
        alt={name}
        className={cn(
          'rounded-full object-cover',
          SIZE_CLASSES[size],
          className,
        )}
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white',
        SIZE_CLASSES[size],
        className,
      )}
      style={{ backgroundColor: color ?? colorForName(name) }}
      /**
       * Hidden from assistive technology because the user's name is always
       * rendered as text next to the avatar. Announcing a decorative letter
       * "M" before the name "Maya Chen" adds nothing.
       */
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}
