/**
 * Closes a floating element when the user clicks or taps outside it.
 *
 * Purpose: dropdowns, popovers, and menus all need this behaviour, and it is
 * fiddly enough that reimplementing it per component guarantees inconsistency.
 *
 * Dependencies: React only.
 */
import { useEffect, type RefObject } from 'react'

export function useOnClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  /** Skip attaching listeners entirely while the element is closed. */
  isActive = true,
): void {
  useEffect(() => {
    if (!isActive) return

    const listener = (event: MouseEvent | TouchEvent) => {
      const element = ref.current
      /**
       * `contains` walks the DOM subtree, so a click on any descendant counts
       * as inside. Comparing `event.target === element` instead would close
       * the menu whenever the user clicked a menu item, which is exactly
       * backwards.
       */
      if (!element || element.contains(event.target as Node)) return
      handler()
    }

    /**
     * `mousedown` rather than `click`. A click fires only after the button is
     * released, so a user who presses down outside and drags back in never
     * closes the menu. Listening on mousedown also means the menu closes
     * before any click handler underneath it runs, which avoids a frame where
     * both are visible.
     *
     * `touchstart` covers mobile, where mouse events are synthesised late.
     */
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    /**
     * The cleanup function is not optional. Without it, every mount adds
     * another listener that is never removed — the listeners accumulate, the
     * detached components they close over cannot be garbage collected, and you
     * have a memory leak that grows with navigation.
     */
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler, isActive])
}
