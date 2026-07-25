/**
 * Shared visual definition for anything that looks like a button.
 *
 * Purpose: let a real `<button>` and a navigation `<a>` be styled identically
 * without one importing the other.
 *
 * WHY THIS FILE EXISTS
 * "Log in" is a navigation: it takes the user to another URL, so semantically
 * it is a link. But it should *look* like a button. The tempting shortcut is
 * to wrap one in the other:
 *
 *     <Link to="/login"><Button>Log in</Button></Link>
 *
 * That produces a `<button>` nested inside an `<a>`, which the HTML spec
 * forbids — an anchor may not contain interactive content. The consequences
 * are real, not theoretical: screen readers announce two separate controls for
 * one visual element, keyboard users have to Tab twice to get past it, and the
 * nested click behaviour varies between browsers.
 *
 * Extracting the class list means `Button` and `LinkButton` can share every
 * pixel of styling while each renders the single correct element. The rule
 * underneath: if it navigates, it is a link; if it performs an action, it is a
 * button. Style follows semantics, never the other way round.
 *
 * Dependencies: the `cn` class helper.
 */
import { cn } from '@/lib/format'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
}

export const buttonClasses = (
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string =>
  cn(
    'inline-flex items-center justify-center rounded-lg font-medium',
    'transition-colors duration-150',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  )
