"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { placeDaySessions, visibleHourRange } from "../layout";
import { TEACHER_OCCUPYING_STATUSES } from "../lifecycle";
import {
  SNAP_MINUTES,
  calendarUrl,
  classifyDestination,
  formatSlotTime,
  offsetFromMinutes,
  slotStarts,
  type MinuteRange,
} from "../scheduling";
import { updateSessionScheduling } from "../actions";
import { SessionDialog } from "./session-dialog";
import { MoveBanner } from "./move-banner";
import { MoveConfirmDialog, type PendingMove } from "./move-confirm-dialog";
import { MoveDestinations, slotDomId, type DestinationSlot } from "./move-destinations";
import type { CalendarSession, CreateClassTeacher, MovingSession } from "../queries";

const HOUR_HEIGHT = 56;
/** Move mode stretches the grid so quarter-hour targets stay comfortably tappable. */
const MOVE_HOUR_HEIGHT = 80;

export type CalendarDay = {
  date: string;
  label: string;
  dayNumber: string;
  isToday: boolean;
};

type Props = {
  days: CalendarDay[];
  sessions: CalendarSession[];
  teachers: CreateClassTeacher[];
  weekStart: string;
  teacherId?: string;
  movingSession: MovingSession | null;
};

export function WeekCalendar({
  days,
  sessions,
  teachers,
  weekStart,
  teacherId,
  movingSession,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<CalendarSession | null>(null);
  const [active, setActive] = useState<DestinationSlot | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isMoving = movingSession !== null;
  const hourHeight = isMoving ? MOVE_HOUR_HEIGHT : HOUR_HEIGHT;

  // The grid must cover the class being moved even when it lives in another week,
  // so its length is taken into account when sizing the visible hours.
  const rangeItems = isMoving
    ? [...sessions, { id: movingSession.id, startMinutes: movingSession.startMinutes, durationMinutes: movingSession.durationMinutes }]
    : sessions;
  const { startHour, endHour } = visibleHourRange(rangeItems);
  const dayStartMinutes = startHour * 60;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = hours.length * hourHeight;

  const destinationStarts = isMoving
    ? slotStarts(startHour, endHour, movingSession.durationMinutes)
    : [];

  /** The moved class's teacher is the only one whose time can block this move. */
  function occupiedOn(date: string): MinuteRange[] {
    if (!movingSession) return [];

    return sessions
      .filter(
        (session) =>
          session.date === date &&
          session.id !== movingSession.id &&
          session.teacherId === movingSession.teacherId &&
          TEACHER_OCCUPYING_STATUSES.includes(session.status)
      )
      .map((session) => ({
        startMinutes: session.startMinutes,
        durationMinutes: session.durationMinutes,
      }));
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

  /** Arrow keys walk the destination grid, so a week is not hundreds of tab stops. */
  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isMoving || !active || destinationStarts.length === 0) return;

    const dayIndex = days.findIndex((day) => day.date === active.date);
    const slotIndex = destinationStarts.indexOf(active.startMinutes);
    if (dayIndex === -1 || slotIndex === -1) return;

    let nextDay = dayIndex;
    let nextSlot = slotIndex;

    switch (event.key) {
      case "ArrowDown": nextSlot = Math.min(slotIndex + 1, destinationStarts.length - 1); break;
      case "ArrowUp": nextSlot = Math.max(slotIndex - 1, 0); break;
      case "ArrowRight": nextDay = Math.min(dayIndex + 1, days.length - 1); break;
      case "ArrowLeft": nextDay = Math.max(dayIndex - 1, 0); break;
      case "Home": nextSlot = 0; break;
      case "End": nextSlot = destinationStarts.length - 1; break;
      case "Escape": exitMoveMode(); return;
      default: return;
    }

    event.preventDefault();
    const target = {
      date: days[nextDay]?.date ?? active.date,
      startMinutes: destinationStarts[nextSlot] ?? active.startMinutes,
    };
    setActive(target);
    document.getElementById(slotDomId(target))?.focus();
  }

  const firstDestination: DestinationSlot | null =
    isMoving && days[0] && destinationStarts[0] !== undefined
      ? { date: days[0].date, startMinutes: destinationStarts[0] }
      : null;
  const tabbable = active ?? firstDestination;

  // Falls back to the raw date when the class sits in a week that is not on screen.
  const originalDay = days.find((day) => day.date === movingSession?.date);
  const originalDayLabel = originalDay
    ? `${originalDay.label} ${originalDay.dayNumber}`
    : (movingSession?.date ?? "");

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

      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="min-w-[860px]">
          <div
            className="grid border-b"
            style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <div />
            {days.map((day) => (
              <div key={day.date} className="border-l px-2 py-3 text-center">
                <span
                  className={cn(
                    "text-xs font-medium",
                    day.isToday ? "text-violet-700" : "text-muted-foreground"
                  )}
                >
                  {day.label} {day.dayNumber}
                </span>
              </div>
            ))}
          </div>

          <div
            className="grid"
            style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))` }}
            onKeyDown={handleGridKeyDown}
          >
            <div style={{ height: gridHeight }}>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="relative pr-2 text-right text-[10px] text-muted-foreground"
                  style={{ height: hourHeight }}
                >
                  <span className="absolute top-0 right-2 -translate-y-1/2">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {days.map((day) => {
              const daySessions = sessions.filter((session) => session.date === day.date);
              const placements = placeDaySessions(daySessions, dayStartMinutes, hourHeight);
              const showsPreview = isMoving && active?.date === day.date;

              return (
                <div
                  key={day.date}
                  className={cn("relative border-l", day.isToday && "bg-violet-50/40")}
                  style={{ height: gridHeight }}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-border/50"
                      style={{ height: hourHeight }}
                    />
                  ))}

                  {placements.map((placement) => {
                    const session = daySessions.find((s) => s.id === placement.id);
                    if (!session) return null;
                    const isCancelled = session.status === "CANCELLED";
                    const isCompleted = session.status === "COMPLETED";
                    const isBeingMoved = movingSession?.id === session.id;

                    return (
                      <button
                        key={session.id}
                        type="button"
                        // During move mode the cards step aside so every destination
                        // underneath stays reachable by pointer and touch.
                        disabled={isMoving}
                        aria-hidden={isMoving ? true : undefined}
                        onClick={() => setSelected(session)}
                        className={cn(
                          "absolute overflow-hidden rounded-md border border-l-2 px-2 py-1 text-left transition-colors",
                          isMoving && "pointer-events-none",
                          isMoving && !isBeingMoved && "opacity-40",
                          isBeingMoved && "z-10 ring-2 ring-violet-600 ring-offset-1",
                          isCancelled &&
                            "border-dashed border-l-muted-foreground/40 bg-muted/50 text-muted-foreground hover:bg-muted",
                          isCompleted &&
                            "border-l-muted-foreground/30 bg-muted/30 text-muted-foreground hover:bg-muted/60",
                          !isCancelled &&
                            !isCompleted &&
                            "border-l-violet-500 bg-card hover:border-violet-300 hover:bg-violet-50"
                        )}
                        style={{
                          top: placement.top + 2,
                          height: placement.height - 4,
                          left: `calc(${placement.leftPercent}% + 4px)`,
                          width: `calc(${placement.widthPercent}% - 8px)`,
                        }}
                      >
                        <span
                          className={cn(
                            "flex items-center gap-1 truncate text-[11px] font-medium",
                            isCancelled && "line-through",
                            !isCancelled && !isCompleted && "text-foreground"
                          )}
                        >
                          {isCompleted && <Check className="size-3 shrink-0" />}
                          <span className="truncate">
                            {session.participants[0]?.studentName ?? "Class"}
                          </span>
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {session.startLabel} · {session.teacherName.split(" ")[0]}
                        </span>
                        {placement.height > 54 && (
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {session.languageName}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {movingSession && (
                    <MoveDestinations
                      date={day.date}
                      dayLabel={`${day.label} ${day.dayNumber}`}
                      slotStarts={destinationStarts}
                      durationMinutes={movingSession.durationMinutes}
                      occupied={occupiedOn(day.date)}
                      originalStartMinutes={originalStartOn(day.date)}
                      dayStartMinutes={dayStartMinutes}
                      pixelsPerHour={hourHeight}
                      active={active}
                      tabbable={tabbable}
                      disabled={isSaving}
                      onActivate={setActive}
                      onSelect={handleSelectDestination}
                    />
                  )}

                  {showsPreview && movingSession && active && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute right-1 left-1 z-30 rounded-md border-2 border-violet-600 bg-violet-200/50 px-2 py-0.5 text-[10px] font-medium text-violet-900"
                      style={{
                        top: offsetFromMinutes(
                          active.startMinutes,
                          dayStartMinutes,
                          hourHeight
                        ),
                        height: (movingSession.durationMinutes / 60) * hourHeight,
                      }}
                    >
                      {formatSlotTime(active.startMinutes)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isMoving && (
        <p className="mt-3 text-xs text-muted-foreground">
          Destinations snap to {SNAP_MINUTES} minutes. Use the arrow keys to choose one, Enter
          to confirm, or Escape to cancel the move.
        </p>
      )}

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
