/**
 * Where each of today's classes stands against the clock, for the dashboard's
 * timeline.
 *
 * - `past`  — it has ended.
 * - `now`   — it has started and not ended.
 * - `next`  — the first class still to start. Only one class is ever `next`,
 *   so the eye has one place to land.
 * - `later` — everything after that.
 *
 * A cancelled class is never `now` or `next`: it is not happening. It keeps
 * `past` or `later` by its time so it stays in order.
 *
 * Pure, so the boundaries are testable without a clock: a class ending at the
 * exact current millisecond has ended, one starting at it is running.
 */
export type TimelinePhase = "past" | "now" | "next" | "later";

export type TimelineSession = {
  startsAtMs: number;
  endsAtMs: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
};

export function timelinePhases(sessions: TimelineSession[], nowMs: number): TimelinePhase[] {
  let nextTaken = false;

  return sessions.map((session) => {
    if (session.endsAtMs <= nowMs) return "past";

    const cancelled = session.status === "CANCELLED";
    if (session.startsAtMs <= nowMs) return cancelled ? "past" : "now";
    if (!cancelled && !nextTaken) {
      nextTaken = true;
      return "next";
    }
    return "later";
  });
}

/**
 * A list of dated rows split into runs of the same day, keeping the order it
 * arrived in — the "needs attention" inbox reads one day at a time.
 */
export function groupByDay<T extends { dateLabel: string }>(
  rows: T[]
): { dateLabel: string; rows: T[] }[] {
  const groups: { dateLabel: string; rows: T[] }[] = [];

  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.dateLabel === row.dateLabel) last.rows.push(row);
    else groups.push({ dateLabel: row.dateLabel, rows: [row] });
  }

  return groups;
}
