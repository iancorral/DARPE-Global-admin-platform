import {
  getCreateClassOptions,
  getMovableSession,
  getTeacherWeekAvailability,
  getWeekSessions,
} from "@/features/sessions/queries";
import { calendarParamsSchema } from "@/features/sessions/schemas";
import { CalendarToolbar } from "@/features/sessions/components/calendar-toolbar";
import { WeekCalendar, type CalendarDay } from "@/features/sessions/components/week-calendar";
import { getScheduleFormOptions } from "@/features/schedules/queries";
import { MONTHS } from "@/features/schedules/schemas";
import {
  DEFAULT_TIMEZONE,
  addDaysToDate,
  formatInZone,
  parseDateOnly,
  startOfWeekDate,
  todayInZone,
} from "@/lib/datetime";

const VISIBLE_DAYS = 6;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; teacher?: string; moving?: string }>;
}) {
  const params = calendarParamsSchema.safeParse(await searchParams);
  const today = todayInZone(DEFAULT_TIMEZONE);
  const todayWeekStart = startOfWeekDate(today);

  const weekStart = params.success && params.data.week
    ? startOfWeekDate(params.data.week)
    : todayWeekStart;
  const teacherId = params.success ? params.data.teacher : undefined;
  const movingId = params.success ? params.data.moving : undefined;

  const [sessions, { teachers }, createClassOptions, movingSession] = await Promise.all([
    getWeekSessions(weekStart, teacherId),
    getScheduleFormOptions(),
    getCreateClassOptions(),
    movingId ? getMovableSession(movingId) : Promise.resolve(null),
  ]);

  // Availability is a second, narrower read rather than part of the calendar's own
  // sessions: the teacher filter decides which cards are drawn, and must never
  // decide which classes count as a conflict. Only loaded while a move is open.
  const movingTeacherBusy = movingSession
    ? await getTeacherWeekAvailability(movingSession.teacherId, weekStart, movingSession.id)
    : [];

  const days: CalendarDay[] = Array.from({ length: VISIBLE_DAYS }, (_, index) => {
    const date = addDaysToDate(weekStart, index);
    const asDate = parseDateOnly(date);

    return {
      date,
      label: formatInZone(asDate, "UTC", "EEE"),
      dayNumber: formatInZone(asDate, "UTC", "d"),
      isToday: date === today,
    };
  });

  const visibleDates = new Set(days.map((day) => day.date));
  const hiddenCount = sessions.filter((session) => !visibleDates.has(session.date)).length;

  const weekEnd = addDaysToDate(weekStart, VISIBLE_DAYS - 1);
  const rangeLabel = `${formatInZone(parseDateOnly(weekStart), "UTC", "MMM d")} – ${formatInZone(
    parseDateOnly(weekEnd),
    "UTC",
    "MMM d, yyyy"
  )}`;

  const generationYear = Number(weekStart.slice(0, 4));
  const generationMonth = Number(weekStart.slice(5, 7));

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Week of {rangeLabel} · {sessions.length} sessions
          </p>
        </div>
        <CalendarToolbar
          weekStart={weekStart}
          todayWeekStart={todayWeekStart}
          teacherId={teacherId}
          teachers={teachers}
          generationMonth={{
            year: generationYear,
            month: generationMonth,
            label: `${MONTHS.find((m) => m.value === generationMonth)?.label ?? ""} ${generationYear}`,
          }}
          movingSessionId={movingSession?.id}
        />
      </div>

      <WeekCalendar
        days={days}
        sessions={sessions}
        students={createClassOptions.students}
        teachers={createClassOptions.teachers}
        weekStart={weekStart}
        today={today}
        teacherId={teacherId}
        movingSession={movingSession}
        movingTeacherBusy={movingTeacherBusy}
      />

      {hiddenCount > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {hiddenCount} session{hiddenCount === 1 ? "" : "s"} fall on Sunday and are not shown in
          this Monday–Saturday view.
        </p>
      )}

      {sessions.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          No sessions this week. Recurring schedules become sessions once the month is generated.
        </p>
      )}
    </div>
  );
}
