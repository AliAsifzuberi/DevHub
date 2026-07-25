/**
 * Presentation helpers for turning raw data into human-readable strings.
 *
 * Purpose: keep formatting logic out of components. A component's job is to
 * describe structure; converting a UTC timestamp into "5 hours ago" is a
 * separate concern that benefits from being testable in isolation and
 * identical everywhere it appears.
 *
 * Dependencies: none. Everything here uses the built-in `Intl` API, which
 * handles locale rules — plurals, number grouping, translated units — far
 * better than hand-rolled string concatenation, and ships with the browser at
 * zero bundle cost.
 */

/** Time units in descending size, paired with their length in seconds. */
const TIME_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
]

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
  style: 'long',
})

/**
 * Converts an ISO timestamp into a relative phrase such as "5 hours ago".
 *
 * The loop picks the largest unit that yields a value of at least one, which
 * is what makes the output read naturally: "2 days ago" rather than
 * "48 hours ago". Very recent times collapse to "just now", because
 * "3 seconds ago" updates itself into a lie the moment the user reads it.
 */
export const formatRelativeTime = (isoDate: string): string => {
  const elapsedSeconds = (Date.now() - new Date(isoDate).getTime()) / 1000

  if (elapsedSeconds < 45) return 'just now'

  for (const [unit, secondsInUnit] of TIME_UNITS) {
    if (elapsedSeconds >= secondsInUnit) {
      const value = Math.floor(elapsedSeconds / secondsInUnit)
      // Negative because the event is in the past; Intl expects a signed
      // value and renders the "ago" suffix from the sign.
      return relativeTimeFormatter.format(-value, unit)
    }
  }

  return 'just now'
}

/**
 * Full timestamp for tooltips, e.g. "24 July 2026 at 14:32".
 *
 * Relative time is friendly but imprecise. Pairing it with an exact value in a
 * `title` attribute gives users the detail on demand without cluttering the
 * interface — a small touch that costs nothing and is genuinely useful when
 * someone is trying to work out when something actually happened.
 */
export const formatAbsoluteTime = (isoDate: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(isoDate))

const compactNumberFormatter = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/**
 * Shortens large counts: 48210 becomes "48.2K".
 *
 * Vote scores and member counts sit in tight layouts where a six-digit number
 * would break the alignment of everything around it. Below 1000 the raw number
 * is returned, because "999" is clearer than "1K" and loses no information.
 */
export const formatCompactNumber = (value: number): string => {
  if (Math.abs(value) < 1000) return String(value)
  return compactNumberFormatter.format(value)
}

/**
 * Joins conditional class names, dropping anything falsy.
 *
 * This exists so components can write
 * `cn('rounded border', isActive && 'border-brand-600')`
 * instead of building template strings with nested ternaries, which get
 * unreadable quickly and tend to leave stray double spaces.
 *
 * A tiny local helper is used rather than pulling in `clsx`: it is six lines,
 * it has no transitive dependencies, and every dependency added to a frontend
 * is code you are shipping to users and trusting with your build.
 */
export const cn = (
  ...classes: Array<string | false | null | undefined>
): string => classes.filter(Boolean).join(' ')
