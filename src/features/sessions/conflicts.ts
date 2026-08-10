export type TimeRange = {
  startsAt: Date;
  durationMinutes: number;
};

/**
 * How far back to look for candidate conflicts. A session starting earlier than
 * this cannot still be running when the rescheduled one begins.
 */
export const CONFLICT_LOOKBACK_MINUTES = 24 * 60;

export function endOf(range: TimeRange): Date {
  return new Date(range.startsAt.getTime() + range.durationMinutes * 60_000);
}

/**
 * True when two sessions occupy the same teacher at the same moment. Ranges are
 * half-open, so a class ending at 10:00 does not conflict with one starting at 10:00.
 */
export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.startsAt < endOf(b) && b.startsAt < endOf(a);
}

export function findOverlap<T extends TimeRange>(candidate: TimeRange, others: T[]): T | null {
  return others.find((other) => overlaps(candidate, other)) ?? null;
}

export type TeacherTimeRange = TimeRange & { teacherId: string };

/**
 * Splits candidates into those a teacher is free for and those that would double
 * book them. Accepted candidates become occupied themselves, so two sessions in
 * the same batch cannot overlap each other either.
 */
export function partitionByTeacherAvailability<T extends TeacherTimeRange>(
  candidates: T[],
  occupied: TeacherTimeRange[]
): { accepted: T[]; conflicted: T[] } {
  const byTeacher = new Map<string, TeacherTimeRange[]>();
  for (const range of occupied) {
    const taken = byTeacher.get(range.teacherId) ?? [];
    taken.push(range);
    byTeacher.set(range.teacherId, taken);
  }

  const accepted: T[] = [];
  const conflicted: T[] = [];

  for (const candidate of candidates) {
    const taken = byTeacher.get(candidate.teacherId) ?? [];

    if (findOverlap(candidate, taken)) {
      conflicted.push(candidate);
      continue;
    }

    accepted.push(candidate);
    taken.push(candidate);
    byTeacher.set(candidate.teacherId, taken);
  }

  return { accepted, conflicted };
}
