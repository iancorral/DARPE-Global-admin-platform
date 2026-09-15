"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * The page transition between sections.
 *
 * A short rise and fade as a new screen settles — the thing good products do
 * that nobody consciously notices, and that they feel the absence of. Linear,
 * Vercel and Stripe all use the same recipe: a few pixels of upward travel, a
 * fast decelerating curve, and it is over before anyone could call it a wait.
 *
 * Three deliberate limits keep it from becoming a delay:
 *
 * - **Under 300 ms.** Staff move between these screens dozens of times a day.
 *   A transition long enough to admire is one they will resent by Thursday.
 * - **No exit animation.** Waiting for the old page to leave before the new one
 *   arrives doubles the perceived wait for nothing.
 * - **Path changes only.** Query strings drive the calendar's week, the list
 *   filters and every dialog; replaying this on each of those would make the
 *   page twitch while somebody is typing.
 *
 * The Web Animations API rather than a CSS class: no re-render, no state, and
 * the animation is cancellable when the route changes again mid-flight. It
 * runs on the compositor, so it cannot cause layout work.
 */
export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = mainRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || reducedMotion.matches) return;

    const animation = element.animate(
      [
        { opacity: 0, transform: "translate3d(0, 8px, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: 260,
        // Fast out of the gate, gentle into the stop.
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "backwards",
      }
    );

    const cancelOnReducedMotion = () => {
      if (reducedMotion.matches) animation.cancel();
    };
    reducedMotion.addEventListener("change", cancelOnReducedMotion);

    return () => {
      animation.cancel();
      reducedMotion.removeEventListener("change", cancelOnReducedMotion);
    };
  }, [pathname]);

  return (
    <main
      ref={mainRef}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-(--app-nav-space) lg:pb-0"
    >
      {children}
    </main>
  );
}
