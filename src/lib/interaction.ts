/**
 * One interaction language for everything clickable.
 *
 * Rows and cards respond the same way wherever they appear: a surface tint on
 * hover, the same tint plus a visible ring on keyboard focus, and no movement
 * that would shift the layout underneath. Written once so a new list cannot
 * quietly invent its own feel.
 *
 * `focus-visible` rather than `focus`, so a pointer click does not leave a ring
 * behind, and every transition is dropped under `prefers-reduced-motion`.
 */

/** A row inside a list: full-width target, tinted on hover and focus. */
export const INTERACTIVE_ROW =
  "cursor-pointer transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset " +
  "motion-reduce:transition-none";

/**
 * A standalone card that is itself a link or button. Lifts by shadow only —
 * never by transform, which would nudge its neighbours on every hover.
 */
export const INTERACTIVE_CARD =
  "cursor-pointer transition-[box-shadow,border-color] hover:border-primary/30 hover:shadow-sm " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "motion-reduce:transition-none";

/** A table row that navigates: the same tint, applied to the `<tr>`. */
export const INTERACTIVE_TABLE_ROW =
  "transition-colors hover:bg-accent/40 focus-within:bg-accent/40 motion-reduce:transition-none";
