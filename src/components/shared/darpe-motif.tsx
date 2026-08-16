import { cn } from "@/lib/utils";

/**
 * DARPE's decorative mark: a meridian arc joining two points — one language
 * carried between two places. Original to this project, and not a logo.
 *
 * Deliberately down to four strokes. An earlier version added dashed latitudes
 * and a third node; at the sizes this actually renders they collapsed into
 * noise and read as a stray drawing rather than a mark. It is used as a
 * centred figure inside empty states, at a size where it is legible — never as
 * a faint watermark behind headings or controls, where it looked like a
 * rendering mistake.
 *
 * Drawn in `currentColor` so the caller sets the tone, and always
 * `aria-hidden`: it carries no information a screen reader could use.
 */
export function DarpeMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none select-none", className)}
    >
      <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <ellipse cx="24" cy="24" rx="7.5" ry="17" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <path
        d="M13 31C19 20 29 17 35 15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="13" cy="31" r="2.75" fill="currentColor" />
      <circle cx="35" cy="15" r="2.75" fill="currentColor" />
    </svg>
  );
}
