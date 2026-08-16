import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Section } from "@/components/shared/page";
import { INTERACTIVE_ROW } from "@/lib/interaction";
import { TONE_CLASSES, languageTone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ATTENDANCE_OPTIONS } from "@/features/sessions/schemas";
import type { ClassStatus } from "@/generated/prisma/client";
import type { StudentSessionRow, StudentSessions } from "../queries";

const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const CLASS_STATUS_VARIANT: Record<ClassStatus, "default" | "secondary" | "outline"> = {
  SCHEDULED: "secondary",
  COMPLETED: "default",
  CANCELLED: "outline",
};

// The same labels the attendance form offers, so the words always match.
const ATTENDANCE_LABELS = Object.fromEntries(
  ATTENDANCE_OPTIONS.map((option) => [option.value, option.label])
);

/**
 * The student's concrete classes: what is coming and what already happened.
 * Server-rendered and read-only; each row links to the calendar week that
 * holds the class, where all the actions live.
 */
export function StudentClasses({ sessions }: { sessions: StudentSessions }) {
  return (
    <>
      <Section
        title="Upcoming classes"
        description={
          sessions.upcomingCount > sessions.upcoming.length
            ? `Next ${sessions.upcoming.length} of ${sessions.upcomingCount} — later weeks are on the calendar.`
            : undefined
        }
      >
        {sessions.upcoming.length === 0 ? (
          <EmptyState tone="compact">
            No upcoming classes. Schedule one from the calendar.
          </EmptyState>
        ) : (
          <SessionRows rows={sessions.upcoming} showAttendance={false} />
        )}
      </Section>

      <Section
        title="Class history"
        description={
          sessions.historyCount > sessions.history.length
            ? `Latest ${sessions.history.length} of ${sessions.historyCount} — earlier weeks are on the calendar.`
            : undefined
        }
      >
        {sessions.history.length === 0 ? (
          <EmptyState tone="compact">
            No classes yet. History appears once a class has taken place.
          </EmptyState>
        ) : (
          <SessionRows rows={sessions.history} showAttendance />
        )}
      </Section>
    </>
  );
}

function SessionRows({
  rows,
  showAttendance,
}: {
  rows: StudentSessionRow[];
  showAttendance: boolean;
}) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={row.weekHref}
            className={cn(
              "group flex min-h-11 items-center gap-3 px-4 py-3 text-sm",
              INTERACTIVE_ROW
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-8 w-1 shrink-0 rounded-full",
                TONE_CLASSES[languageTone({ name: row.languageName })].dot
              )}
            />
            <span className="w-20 shrink-0 tabular-nums text-muted-foreground">
              {row.dateLabel}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium group-hover:underline">
                {row.startLabel} · {row.durationMinutes} min
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {row.languageName} · {row.teacherName}
                {showAttendance && row.attendance
                  ? ` · ${ATTENDANCE_LABELS[row.attendance]}`
                  : ""}
              </span>
            </span>
            <Badge variant={CLASS_STATUS_VARIANT[row.status]}>
              {CLASS_STATUS_LABELS[row.status]}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
