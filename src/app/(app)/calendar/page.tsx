import {
  getCreateClassOptions,
  getMovableSession,
  getTeacherWeekAvailability,
  getWeekSessions,
} from "@/features/sessions/queries";
import { calendarParamsSchema } from "@/features/sessions/schemas";
import {
  calendarCreateIntent,
  preselectedStudentId,
} from "@/features/sessions/calendar-return";
import { CalendarToolbar } from "@/features/sessions/components/calendar-toolbar";
import {
  WeekCalendar,
  type CalendarDay,
  type InitialCreation,
} from "@/features/sessions/components/week-calendar";
import { parseWallClockMinutes } from "@/features/sessions/scheduling";
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

/*
 * Monday through Sunday.
 *
 * The data model and generation have always supported Sunday; only the view
 * left it out, which meant a Sunday class existed and was invisible — the page
 * had to warn that sessions were being hidden. Most teaching is online and a
 * weekend class is a real possibility, so the week is now shown whole.
 */
const VISIBLE_DAYS = 7;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = calendarParamsSchema.safeParse(await searchParams);
  const today = todayInZone(DEFAULT_TIMEZONE);
  const todayWeekStart = startOfWeekDate(today);
  // Academy wall-clock time now, only so the phone agenda opens near the current
  // half hour. Never rendered, so it cannot mismatch between server and client.
  const nowMinutes = parseWallClockMinutes(formatInZone(new Date(), DEFAULT_TIMEZONE)) ?? 0;

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

  // A student id from the address bar is only a suggestion: it has to be one of
  // the students who may actually be given a class, or the form ignores it.
  const requestedStudentId = params.success
    ? preselectedStudentId(params.data.student)
    : null;
  const preselected =
    createClassOptions.students.find((student) => student.id === requestedStudentId)?.id ??
    null;

  // The dialog only reopens at a position this week actually shows, and never
  // while a class is being moved — a position means one thing at a time.
  const intent = params.success ? calendarCreateIntent(params.data) : null;
  const intentDay = intent ? days.find((day) => day.date === intent.date) : undefined;
  const initialCreation: InitialCreation | null =
    intent && intentDay
      ? {
          slot: {
            date: intent.date,
            startMinutes: intent.startMinutes,
            dayLabel: `${intentDay.label} ${intentDay.dayNumber}`,
          },
          mode: intent.mode,
          studentId:
            createClassOptions.students.find((student) => student.id === intent.studentId)
              ?.id ?? null,
          durationMinutes: intent.durationMinutes,
          endsOn: intent.endsOn,
        }
      : null;

  const weekEnd = addDaysToDate(weekStart, VISIBLE_DAYS - 1);
  const rangeLabel = `${formatInZone(parseDateOnly(weekStart), "UTC", "MMM d")} – ${formatInZone(
    parseDateOnly(weekEnd),
    "UTC",
    "MMM d, yyyy"
  )}`;

  const generationYear = Number(weekStart.slice(0, 4));
  const generationMonth = Number(weekStart.slice(5, 7));

  return (
    /*
     * No maximum and tight gutters on desktop: the week grid is the tool staff
     * work in, seven columns have to share the width, and every pixel of column
     * is legibility. Nothing else on the page competes for the space.
     *
     * The `lg:` rules apply only where this is a normal block; the phone layout
     * keeps the flex bounding the mobile agenda depends on.
     */
    <div className="flex min-h-0 flex-1 flex-col p-4 lg:block lg:px-6 lg:py-6">
      <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-4 lg:mb-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Calendar</h1>
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
        nowMinutes={nowMinutes}
        teacherId={teacherId}
        movingSession={movingSession}
        movingTeacherBusy={movingTeacherBusy}
        initialCreation={initialCreation}
        preselectedStudentId={preselected}
      />

      {sessions.length === 0 && (
        <p className="mt-3 shrink-0 text-xs text-muted-foreground">
          No classes this week. Add one from the grid, or generate the month if recurring
          schedules exist.
        </p>
      )}
    </div>
  );
}
