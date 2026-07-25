/**
 * A React Router link that looks like a button.
 *
 * Purpose: navigation that needs button-level visual prominence, rendered as a
 * single `<a>` rather than a button nested inside one.
 *
 * See `lib/buttonStyles.ts` for why nesting the two is a genuine bug and not
 * merely untidy.
 *
 * Because this renders an anchor, users get everything the browser gives links
 * for free: middle-click to open in a new tab, right-click to copy the
 * address, and a visible target in the status bar on hover. A button wired up
 * with an onClick handler that calls `navigate()` silently loses all of it.
 *
 * Dependencies: React Router and the shared button styles.
 */
import { Link, type LinkProps } from 'react-router-dom'
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from '@/lib/buttonStyles'

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </Link>
  )
}
