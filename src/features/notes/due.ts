/**
 * Where a note's reminder day stands against today, both YYYY-MM-DD in the
 * academy timezone. Plain string comparison is exact for that format.
 */
export type DueState = "overdue" | "today" | "upcoming";

export function dueState(dueOn: string | null, today: string): DueState | null {
  if (!dueOn) return null;
  if (dueOn < today) return "overdue";
  if (dueOn === today) return "today";
  return "upcoming";
}
