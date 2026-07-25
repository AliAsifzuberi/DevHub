/**
 * The application's button primitive, for actions.
 *
 * Purpose: make every button in DevHub look and behave consistently, and make
 * the *correct* button the easiest one to write.
 *
 * Use this for things that *do* something — submit a form, cast a vote, open a
 * menu. For something that *goes* somewhere, use `LinkButton`, which shares
 * these exact styles but renders an anchor.
 *
 * Why a component instead of a shared class string?
 * Because a class string still has to be copied, and copies drift. More
 * importantly, a component can encode behaviour that is easy to forget:
 * disabling while a request is in flight, showing a spinner, and setting
 * `type="button"` so it does not accidentally submit a form. Each of those is
 * a bug someone will otherwise reintroduce.
 *
 * Dependencies: React (for prop types) and the shared button styles.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from '@/lib/buttonStyles'

/**
 * Extending the native button props means every standard attribute —
 * `onClick`, `aria-label`, `form`, `autoFocus` — keeps working without being
 * redeclared. Wrapping an element in a component that silently drops its
 * native API is a common and frustrating mistake, especially for accessibility
 * attributes.
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  /**
   * Defaulting to `type="button"` rather than the HTML default of `submit`.
   * A button inside a <form> with no explicit type submits it, which causes
   * mystifying full-page reloads when someone adds a "cancel" button to a
   * form. Opting into submission explicitly is far safer than opting out.
   */
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      /**
       * A loading button is disabled as well. Without this the user can click
       * "Post" three times before the first request resolves and create three
       * posts — a double-submit bug that is invisible on a fast local network
       * and very visible in production.
       */
      disabled={disabled || isLoading}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {isLoading && (
        <span
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          // Decorative: the accompanying text already conveys the state, so
          // announcing the spinner separately would only add noise for screen
          // reader users.
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}
