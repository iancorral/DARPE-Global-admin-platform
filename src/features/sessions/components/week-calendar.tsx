"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { visibleHourRange } from "../layout";
import type { CreateMode } from "../calendar-return";
import {
  SCHEDULING_INTERVAL_MINUTES,
  calendarMode,
  calendarUrl,
  classifyDestination,
  creationStarts as creationStartsIn,
  formatSlotTime,
  occupiedOnDate,
  offersCreation,
  slotStarts,
  type CreationSlot,
  type MinuteRange,
} from "../scheduling";
import { updateSessionScheduling } from "../actions";
import { SessionDialog } from "./session-dialog";
import { CreateClassDialog } from "./create-class-dialog";
import { createSlotDomId } from "./create-positions";
import { MoveBanner } from "./move-banner";
import { MoveConfirmDialog, type PendingMove } from "./move-confirm-dialog";
import { WeekGrid } from "./week-grid";
import { DayAgenda } from "./day-agenda";
import type { DestinationSlot } from "./move-destinations";
import type {
  CalendarSession,
  CreateClassStudent,
  CreateClassTeacher,
  MovingSession,
  TeacherBusyBlock,
} from "../queries";
import type { CalendarDay } from "./calendar-day";

export type { CalendarDay };

type Props = {
  days: CalendarDay[];
  sessions: CalendarSession[];
  students: CreateClassStudent[];
  teachers: CreateClassTeacher[];
  weekStart: string;
  /** Today in the academy timezone, so a past position can say that it is one. */
  today: string;
  teacherId?: string;
  movingSession: MovingSession | null;
  /**
   * The moved teacher's booked time this week, loaded independently of the teacher
   * filter. Empty when nothing is being moved.
   */
  movingTeacherBusy: TeacherBusyBlock[];
  /**
   * A create-class dialog the URL asks to reopen, already resolved to a position
   * in this week. Set after adding a student mid-creation; null otherwise.
   */
  initialCreation: InitialCreation | null;
  /** A student to preselect, from their profile's "Schedule class" link. */
  preselectedStudentId: string | null;
};

export type InitialCreation = {
  slot: CreationSlot;
  mode: CreateMode;
  studentId: string | null;
  /** Restored from the URL after adding a student, or null for the defaults. */
  durationMinutes: number | null;
  endsOn: string | null;
};

/**
 * The weekly calendar, in the two shapes it takes.
 *
 * Both are the same calendar: one week, the same days, the same move mode and the
 * same confirmation step. All of the state that a move consists of lives here, so
 * switching between a phone and a laptop mid-move changes only how the week is
 * drawn, never what the move means.
 */
export function WeekCalendar({
  days,
  sessions,
  students,
  teachers,
  weekStart,
  today,
  teacherId,
  movingSession,
  movingTeacherBusy,
  initialCreation,
  preselectedStudentId,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<CalendarSession | null>(null);
  const [active, setActive] = useState<DestinationSlot | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  // Opens straight onto the position the round trip started from, so coming back
  // from adding a student lands exactly where creating one was interrupted.
  const [creating, setCreating] = useState<CreationSlot | null>(
    initialCreation?.slot ?? null
  );
  const [isSaving, setIsSaving] = useState(false);
  // The agenda remembers which day of the week is open, not which date. Paging to
  // another week mid-move then keeps you on the same weekday instead of throwing
  // you back to the start of the week.
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(
    initialCreation
      ? days.findIndex((day) => day.date === initialCreation.slot.date)
      : null
  );
  // The reopened dialog is a one-off: once it has been dealt with the position
  // leaves the address bar, so reloading the page does not reopen it.
  const hasClearedUrlContext = useRef(false);

  const isMoving = movingSession !== null;
  // Move mode comes from the URL and owns every position while it is open, so
  // creation is never offered alongside it and a position never means two things.
  const mode = calendarMode(movingSession?.id ?? null);
  const showsCreation = offersCreation(mode);

  const defaultDayIndex = Math.max(
    0,
    days.findIndex((day) => day.isToday)
  );
  const dayIndex =
    selectedDayIndex !== null && selectedDayIndex >= 0 && selectedDayIndex < days.length
      ? selectedDayIndex
      : defaultDayIndex;
  const selectedDate = days[dayIndex]?.date ?? weekStart;

  // The grid must cover the class being moved even when it lives in another week,
  // so its length is taken into account when sizing the visible hours.
  const rangeItems = movingSession
    ? [
        ...sessions,
        {
          id: movingSession.id,
          startMinutes: movingSession.startMinutes,
          durationMinutes: movingSession.durationMinutes,
        },
      ]
    : sessions;
  const { startHour, endHour } = visibleHourRange(rangeItems);
  const dayStartMinutes = startHour * 60;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  const destinationStarts = movingSession
    ? slotStarts(startHour, endHour, movingSession.durationMinutes)
    : [];

  // Every half hour on screen, whatever is already drawn there: two teachers can
  // hold classes at the same time, so a busy-looking position is still offered and
  // the server decides whether the teacher actually picked is free.
  const creationStarts = showsCreation ? creationStartsIn(startHour, endHour) : [];

  /**
   * The moved class's teacher is the only one whose time can block this move, and
   * their booked time is loaded separately from the sessions on screen — a
   * calendar filtered to another teacher still classifies destinations correctly.
   */
  function occupiedOn(date: string): MinuteRange[] {
    return occupiedOnDate(movingTeacherBusy, date);
  }

  /**
   * Closing the creation dialog puts focus back on the position that opened it, so
   * a keyboard user carries on from where they were in the week rather than at the
   * top of the page. Deferred by a frame so the dialog has finished closing.
   */
  function closeCreation() {
    const position = creating;
    setCreating(null);

    if (initialCreation && !hasClearedUrlContext.current) {
      hasClearedUrlContext.current = true;
      router.replace(calendarUrl({ week: weekStart, teacher: teacherId }));
    }

    if (!position) return;
    requestAnimationFrame(() => {
      document.getElementById(createSlotDomId(position))?.focus();
    });
  }

  function originalStartOn(date: string): number | null {
    return movingSession && movingSession.date === date ? movingSession.startMinutes : null;
  }

  function exitMoveMode() {
    router.push(calendarUrl({ week: weekStart, teacher: teacherId }));
  }

  function handleSelectDestination(slot: DestinationSlot) {
    if (!movingSession) return;

    const day = days.find((candidate) => candidate.date === slot.date);
    if (!day) return;

    setPendingMove({
      date: slot.date,
      dayLabel: `${day.label} ${day.dayNumber}`,
      startMinutes: slot.startMinutes,
      conflicts:
        classifyDestination(
          { startMinutes: slot.startMinutes, durationMinutes: movingSession.durationMinutes },
          occupiedOn(slot.date),
          originalStartOn(slot.date)
        ) === "conflict",
    });
  }

  async function handleConfirmMove() {
    if (!movingSession || !pendingMove) return;

    setIsSaving(true);
    const result = await updateSessionScheduling({
      id: movingSession.id,
      teacherId: movingSession.teacherId,
      date: pendingMove.date,
      startTime: formatSlotTime(pendingMove.startMinutes),
      durationMinutes: movingSession.durationMinutes,
    });
    setIsSaving(false);

    if (!result.success) {
      // Nothing was written and nothing on screen moved, so the class simply stays
      // where it is and move mode remains open for another attempt.
      setPendingMove(null);
      toast.error(result.error);
      return;
    }

    setPendingMove(null);
    toast.success("Class moved");
    router.push(calendarUrl({ week: weekStart, teacher: teacherId }));
    router.refresh();
  }

  // Falls back to the raw date when the class sits in a week that is not on screen.
  const originalDay = days.find((day) => day.date === movingSession?.date);
  const originalDayLabel = originalDay
    ? `${originalDay.label} ${originalDay.dayNumber}`
    : (movingSession?.date ?? "");

  const shared = {
    days,
    sessions,
    movingSession,
    destinationStarts,
    creationStarts,
    showsCreation,
    occupiedOn,
    originalStartOn,
    disabled: isSaving,
    onOpenSession: setSelected,
    onSelectDestination: handleSelectDestination,
    onCreateAt: setCreating,
  };

  return (
    <>
      {movingSession && (
        <MoveBanner
          session={movingSession}
          originalDayLabel={originalDayLabel}
          onCancel={exitMoveMode}
          disabled={isSaving}
        />
      )}

      <div className="lg:hidden">
        <DayAgenda
          {...shared}
          selectedDate={selectedDate}
          onSelectDay={(date) =>
            setSelectedDayIndex(days.findIndex((day) => day.date === date))
          }
        />
      </div>

      <div className="hidden lg:block">
        <WeekGrid
          {...shared}
          hours={hours}
          dayStartMinutes={dayStartMinutes}
          active={active}
          onActivate={setActive}
          onExitMoveMode={exitMoveMode}
        />
      </div>

      {isMoving && (
        <p className="mt-3 text-xs text-muted-foreground">
          Classes start on the hour or half hour, so destinations are{" "}
          {SCHEDULING_INTERVAL_MINUTES} minutes apart. On a larger screen the arrow keys
          move between them and Escape cancels the move.
        </p>
      )}

      <CreateClassDialog
        // Belt and braces: move mode already hides every creation control, so this
        // can only be open while browsing.
        slot={showsCreation ? creating : null}
        isPast={creating !== null && creating.date < today}
        students={students}
        teachers={teachers}
        weekStart={weekStart}
        teacherFilterId={teacherId}
        initialMode={initialCreation?.mode}
        initialStudentId={initialCreation?.studentId ?? preselectedStudentId}
        initialDurationMinutes={initialCreation?.durationMinutes}
        initialEndsOn={initialCreation?.endsOn}
        onOpenChange={(open) => !open && closeCreation()}
      />

      <SessionDialog
        session={selected}
        teachers={teachers}
        weekStart={weekStart}
        teacherFilterId={teacherId}
        onOpenChange={(open) => !open && setSelected(null)}
      />

      {movingSession && (
        <MoveConfirmDialog
          session={movingSession}
          move={pendingMove}
          originalDayLabel={originalDayLabel}
          isSaving={isSaving}
          onCancel={() => setPendingMove(null)}
          onConfirm={handleConfirmMove}
        />
      )}
    </>
  );
}
