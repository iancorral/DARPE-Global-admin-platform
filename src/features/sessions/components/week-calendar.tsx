"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { visibleHourRange } from "../layout";
import { visibleLanguageLegend } from "../legend";
import type { CreateMode } from "../calendar-return";
import {
  SCHEDULING_INTERVAL_MINUTES,
  calendarMode,
  calendarUrl,
  creationStarts as creationStartsIn,
  formatSlotTime,
  occupiedOnDate,
  offersCreation,
  slotStarts,
  type CreationSlot,
  type MinuteRange,
} from "../scheduling";
import { updateSessionScheduling } from "../actions";
import { REQUEST_FAILED_MESSAGE } from "../request-feedback";
import { SessionDialog } from "./session-dialog";
import { CreateClassDialog } from "./create-class-dialog";
import { useTriggerFocus } from "./trigger-focus";
import { MoveBanner } from "./move-banner";
import { WeekGrid } from "./week-grid";
import { DayAgenda } from "./day-agenda";
import { LanguageLegend } from "./language-legend";
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
  /**
   * Now, in academy wall-clock minutes. Used only to position the phone agenda
   * when it opens, never rendered, so it cannot cause a hydration mismatch.
   */
  nowMinutes: number;
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
 * Both are the same calendar: one week, the same days and the same move mode. All
 * of the state a move consists of lives here, so switching between a phone and a
 * laptop mid-move changes only how the week is drawn, never what the move means.
 */
export function WeekCalendar({
  days,
  sessions,
  students,
  teachers,
  weekStart,
  today,
  nowMinutes,
  teacherId,
  movingSession,
  movingTeacherBusy,
  initialCreation,
  preselectedStudentId,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<CalendarSession | null>(null);
  const [active, setActive] = useState<DestinationSlot | null>(null);
  // The destination currently being written, or null. Doubles as the pending flag.
  const [savingTo, setSavingTo] = useState<DestinationSlot | null>(null);
  // Opens straight onto the position the round trip started from, so coming back
  // from adding a student lands exactly where creating one was interrupted.
  const [creating, setCreating] = useState<CreationSlot | null>(
    initialCreation?.slot ?? null
  );
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
  // Which button opened each dialog. Recorded rather than rebuilt from an id,
  // because the agenda and the grid both draw this day and only one is on screen.
  const creationTrigger = useTriggerFocus();
  const sessionTrigger = useTriggerFocus();
  const destinationTrigger = useTriggerFocus();

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
   * Closing the creation dialog hands focus back to the position that opened it, so
   * a keyboard user carries on from where they were in the week rather than at the
   * top of the page. Base UI does the restoring, from the element recorded when the
   * position was pressed — looking the position up by id would find the copy in
   * whichever view is hidden, which cannot take focus.
   */
  function closeCreation() {
    setCreating(null);

    if (initialCreation && !hasClearedUrlContext.current) {
      hasClearedUrlContext.current = true;
      router.replace(calendarUrl({ week: weekStart, teacher: teacherId }));
    }
  }

  function originalStartOn(date: string): number | null {
    return movingSession && movingSession.date === date ? movingSession.startMinutes : null;
  }

  /**
   * Leaves move mode, keeping the week and teacher filter that were on screen.
   *
   * Replaces rather than pushes: `?moving=` is temporary state, not somewhere the
   * reader navigated to. Pushing would leave the abandoned move in history, so Back
   * would silently put them into move mode again for a class they had finished with.
   */
  function exitMoveMode() {
    router.replace(calendarUrl({ week: weekStart, teacher: teacherId }));
  }

  /**
   * Moves the class as soon as a destination is chosen.
   *
   * Entering move mode was the deliberate act; the tap only says where. A second
   * "are you sure" between the two asked the same question twice and, on a phone,
   * put a modal over the very grid the choice was made on. Destructive things —
   * cancelling a class, ending a series — still confirm, because those cannot be
   * undone by simply moving the class back.
   *
   * The class stays drawn where it is until the server answers, so nothing on
   * screen is ever ahead of what has actually been written.
   */
  async function handleSelectDestination(slot: DestinationSlot, trigger: HTMLElement) {
    // One move at a time: a second tap while the first is in flight is ignored.
    if (!movingSession || savingTo) return;

    const day = days.find((candidate) => candidate.date === slot.date);
    if (!day) return;

    destinationTrigger.capture(trigger);
    setSavingTo(slot);

    try {
      const result = await updateSessionScheduling({
        id: movingSession.id,
        teacherId: movingSession.teacherId,
        date: slot.date,
        startTime: formatSlotTime(slot.startMinutes),
        durationMinutes: movingSession.durationMinutes,
      });

      if (!result.success) {
        // Nothing was written and nothing moved on screen. Move mode stays open,
        // and focus goes back to the destination that was refused so another can
        // be chosen straight away.
        toast.error(result.error);
        trigger.focus();
        return;
      }

      toast.success(
        `Class moved to ${day.label} ${day.dayNumber} at ${formatSlotTime(slot.startMinutes)}`
      );
      // Move mode is left only now that the write has actually happened — a refused
      // move must never look like a successful one.
      //
      // Replaced, not pushed: the move is done, so the URL that was asking for it
      // must not stay in history. Pushing would let Back re-enter move mode for a
      // class that has already been moved. This navigation is still what refreshes
      // the week — the action's `revalidatePath("/calendar")` has invalidated the
      // route, and `replace` re-fetches it exactly as `push` would, so the card
      // appears at its new time without a second `router.refresh()`.
      router.replace(calendarUrl({ week: weekStart, teacher: teacherId }));
    } catch {
      toast.error(REQUEST_FAILED_MESSAGE);
      trigger.focus();
    } finally {
      setSavingTo(null);
    }
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
    disabled: savingTo !== null,
    onOpenSession: (session: CalendarSession, trigger: HTMLElement) => {
      sessionTrigger.capture(trigger);
      setSelected(session);
    },
    onSelectDestination: handleSelectDestination,
    onCreateAt: (slot: CreationSlot, trigger: HTMLElement) => {
      creationTrigger.capture(trigger);
      setCreating(slot);
    },
  };

  return (
    <>
      {movingSession && (
        <MoveBanner
          session={movingSession}
          originalDayLabel={originalDayLabel}
          onCancel={exitMoveMode}
          disabled={savingTo !== null}
          savingLabel={
            savingTo
              ? `Moving to ${
                  days.find((day) => day.date === savingTo.date)?.label ?? savingTo.date
                } at ${formatSlotTime(savingTo.startMinutes)}…`
              : null
          }
        />
      )}

      {/*
        On a phone the agenda is a bounded panel that fills whatever height is left
        and scrolls inside itself; from `lg` up the week grid takes over and the
        page scrolls normally again.
      */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
        <DayAgenda
          {...shared}
          selectedDate={selectedDate}
          weekStart={weekStart}
          nowMinutes={nowMinutes}
          startHour={startHour}
          endHour={endHour}
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
        {/* Derived from the week on screen, so it explains only colours in use. */}
        <LanguageLegend entries={visibleLanguageLegend(sessions)} className="mt-3" />
      </div>

      {isMoving && (
        <p className="mt-3 shrink-0 text-xs text-muted-foreground">
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
        finalFocus={creationTrigger.resolve}
        onOpenChange={(open) => !open && closeCreation()}
      />

      <SessionDialog
        session={selected}
        teachers={teachers}
        weekStart={weekStart}
        teacherFilterId={teacherId}
        finalFocus={sessionTrigger.resolve}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
