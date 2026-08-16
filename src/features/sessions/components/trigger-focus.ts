"use client";

import { useCallback, useRef } from "react";

/**
 * Whether an element is still in the document and actually drawn.
 *
 * An element inside the responsive tree that CSS has hidden is still in the DOM and
 * still answers `getElementById`, but it cannot take focus — calling `focus()` on it
 * does nothing and focus falls back to the body. `getClientRects()` is empty for
 * anything inside `display: none`, which is exactly the case to rule out.
 */
export function isVisibleElement(element: HTMLElement | null): element is HTMLElement {
  return Boolean(element?.isConnected && element.getClientRects().length > 0);
}

/**
 * Remembers the control that opened a controlled dialog, so focus can return to it.
 *
 * These dialogs are opened imperatively rather than through `Dialog.Trigger`, so
 * Base UI has no trigger to restore focus to. Recording the element the user
 * actually pressed — rather than rebuilding an id and looking it up — is what keeps
 * focus in the view they are looking at: the same day and time exists in both the
 * agenda and the grid, and only one of them is on screen.
 *
 * `resolve` is passed to `finalFocus`. Returning `true` asks Base UI for its default
 * behaviour, which is the safe fallback when the trigger has been unmounted by a
 * refresh or a navigation.
 */
export function useTriggerFocus() {
  const triggerRef = useRef<HTMLElement | null>(null);

  const capture = useCallback((element: HTMLElement | null) => {
    triggerRef.current = element;
  }, []);

  const resolve = useCallback((): HTMLElement | true => {
    return isVisibleElement(triggerRef.current) ? triggerRef.current : true;
  }, []);

  return { capture, resolve };
}
