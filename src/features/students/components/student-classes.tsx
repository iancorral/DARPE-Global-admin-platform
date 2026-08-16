import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
 * Server-rendered, read-only; each row links to the calendar week that holds
 * the class, where all the actions live.
 */
export function StudentClasses({ sessions }: { sessions: StudentSessions }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Upcoming classes</CardTitle>
          {sessions.upcomingCount > sessions.upcoming.length && (
            <p className="text-xs text-muted-foreground">
              Next {sessions.upcoming.length} of {sessions.upcomingCount} — later weeks are on
              the calendar.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {sessions.upcoming.length === 0 ? (
            <EmptyNote>
              No upcoming classes. Schedule one from the calendar, or generate the month if a
              recurring schedule exists.
            </EmptyNote>
          ) : (
            <SessionRows rows={sessions.upcoming} showAttendance={false} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Class history</CardTitle>
          {sessions.historyCount > sessions.history.length && (
            <p className="text-xs text-muted-foreground">
              Latest {sessions.history.length} of {sessions.historyCount} — earlier weeks are on
              the calendar.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {sessions.history.length === 0 ? (
            <EmptyNote>No classes yet. History appears once a class date has passed.</EmptyNote>
          ) : (
            <SessionRows rows={sessions.history} showAttendance />
          )}
        </CardContent>
      </Card>
    </div>
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
    <ul className="divide-y">
      {rows.map((row) => (
        <li key={row.id}>
          <Link href={row.weekHref} className="group flex items-center gap-3 py-2.5 text-sm">
            <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
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

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
