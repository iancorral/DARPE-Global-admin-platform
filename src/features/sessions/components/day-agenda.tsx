"use client";

import { useEffect, useRef } from "react";
import { Check, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TONE_CLASSES, languageTone } from "@/lib/tone";
import {
  buildAgendaRows,
  classifyDestination,
  formatSlotTime,
  initialAgendaScrollMinutes,
  type CreationSlot,
  type DestinationState,
  type MinuteRange,
} from "../scheduling";
import {
  agendaRowId,
  createPositionId,
  moveDestinationId,
  sessionCardId,
} from "../element-ids";
import type { DestinationSlot } from "./move-destinations";
import type { CalendarSession, MovingSession } from "../queries";
import type { CalendarDay } from "./calendar-day";

const STATE_LABEL: Record<DestinationState, string> = {
  original: "Current time",
  conflict: "Teacher busy",
  free: "Available",
};

type Props = {
  days: CalendarDay[];
  sessions: CalendarSession[];
  selectedDate: string;
  onSelectDay: (date: string) => void;
  movingSession: MovingSession | null;
  destinationStarts: number[];
  creationStarts: number[];
  showsCreation: boolean;
  occupiedOn: (date: string) => MinuteRange[];
  originalStartOn: (date: string) => number | null;
  disabled: boolean;
  /** The week on screen, so changing week repositions the agenda once. */
  weekStart: string;
  /** Now, in academy wall-clock minutes, for today's opening position. */
  nowMinutes: number;
  startHour: number;
  endHour: number;
  /** Each handler is handed the button pressed, so focus can return to it. */
  onOpenSession: (session: CalendarSession, trigger: HTMLElement) => void;
  onSelectDestination: (slot: DestinationSlot, trigger: HTMLElement) => void;
  onCreateAt: (slot: CreationSlot, trigger: HTMLElement) => void;
};

/**
 * The phone view: pick a day, then read that day top to bottom.
 *
 * A six-day grid squeezed into a phone gives columns too narrow to read and
 * targets too small to hit, so the week becomes a day selector and the day becomes
 * a vertical agenda. It is the same week, the same days and the same move mode as
 * the desktop grid — only the shape changes, so nothing has to be learned twice.
 */
export function DayAgenda({
  days,
  sessions,
  selectedDate,
  onSelectDay,
  movingSession,
  destinationStarts,
  creationStarts,
  showsCreation,
  occupiedOn,
  originalStartOn,
  disabled,
  weekStart,
  nowMinutes,
  startHour,
  endHour,
  onOpenSession,
  onSelectDestination,
  onCreateAt,
}: Props) {
  const isMoving = movingSession !== null;
  const daySessions = sessions.filter((session) => session.date === selectedDate);
  // Whichever the current mode offers at a position: somewhere to move the class
  // to, or somewhere to start a new one. Never both.
  const rows = buildAgendaRows(
    daySessions,
    isMoving ? destinationStarts : showsCreation ? creationStarts : []
  );
  const occupied = occupiedOn(selectedDate);
  const originalStart = originalStartOn(selectedDate);
  const selectedDay = days.find((day) => day.date === selectedDate);

  const scrollRef = useRef<HTMLDivElement>(null);
  // What the agenda was last positioned for. Only a real change of day or week
  // repositions it, so closing a dialog or entering move mode leaves the reader
  // exactly where they were.
  const positionedFor = useRef<string | null>(null);

  useEffect(() => {
    const anchor = `${weekStart}|${selectedDate}`;
    if (positionedFor.current === anchor) return;
    positionedFor.current = anchor;

    const container = scrollRef.current;
    if (!container) return;

    const target = initialAgendaScrollMinutes({
      isToday: selectedDay?.isToday ?? false,
      nowMinutes,
      firstSessionMinutes: daySessions[0]?.startMinutes ?? null,
      startHour,
      endHour,
    });

    if (target === null) {
      container.scrollTop = 0;
      return;
    }

    // The exact half hour may not be a row, so the first row at or after it wins.
    const row = rows.find((candidate) => candidate.startMinutes >= target);
    const element = row
      ? document.getElementById(agendaRowId(selectedDate, row.startMinutes))
      : null;

    container.scrollTop = element ? element.offsetTop : 0;
  }, [weekStart, selectedDate, selectedDay, nowMinutes, startHour, endHour, daySessions, rows]);

  return (
    // A self-contained panel: the day selector and the day's summary stay put, and
    // only the schedule below them scrolls. The page itself never grows to the
    // height of a whole day, so nothing ends up behind the fixed bottom navigation.
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
      <div
        role="tablist"
        aria-label="Day of the week"
        className="flex shrink-0 gap-1 overflow-x-auto border-b p-2"
      >
        {days.map((day) => {
          const isSelected = day.date === selectedDate;

          return (
            <button
              key={day.date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectDay(day.date)}
              className={cn(
                "flex min-h-11 flex-1 flex-col items-center justify-center rounded-md px-2 py-1 transition-colors",
                "focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none",
                isSelected
                  ? "bg-violet-600 text-white"
                  : "text-muted-foreground hover:bg-violet-50",
                !isSelected && day.isToday && "text-violet-700"
              )}
            >
              <span className="text-[10px] font-medium">{day.label}</span>
              <span className="text-sm font-semibold">{day.dayNumber}</span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2">
        <p className="min-w-0 truncate text-sm font-medium">
          {selectedDay ? `${selectedDay.label} ${selectedDay.dayNumber}` : "Selected day"}
        </p>
        <p className="shrink-0 text-xs text-muted-foreground">
          {isMoving
            ? "Choose a new time"
            : daySessions.length === 1
              ? "1 class"
              : `${daySessions.length} classes`}
        </p>
      </div>

      <div
        ref={scrollRef}
        role="region"
        aria-label={
          selectedDay
            ? `Schedule for ${selectedDay.label} ${selectedDay.dayNumber}`
            : "Schedule for the selected day"
        }
        tabIndex={0}
        // `scroll-pb-16` keeps the last row clear of the panel's bottom edge when it
        // is scrolled to, rather than flush against it.
        className="relative min-h-0 flex-1 divide-y scroll-pb-16 overflow-y-auto overscroll-contain focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-inset focus-visible:outline-none"
      >
        {daySessions.length === 0 && (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            No classes on{" "}
            {selectedDay ? `${selectedDay.label} ${selectedDay.dayNumber}` : "this day"}.
            {showsCreation && !isMoving && " Pick a time below to add one."}
          </p>
        )}

        {rows.map((row) => {
          const state = movingSession
            ? classifyDestination(
                { startMinutes: row.startMinutes, durationMinutes: movingSession.durationMinutes },
                occupied,
                originalStart
              )
            : null;

          return (
            <div
              key={row.startMinutes}
              id={agendaRowId(selectedDate, row.startMinutes)}
              className="p-2"
            >
              {row.sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isBeingMoved={movingSession?.id === session.id}
                  isMoving={isMoving}
                  onOpen={(trigger) => onOpenSession(session, trigger)}
                />
              ))}

              {row.isActionable && selectedDay && state && (
                <button
                  type="button"
                  id={moveDestinationId("agenda", selectedDate, row.startMinutes)}
                  disabled={disabled}
                  aria-label={`Move to ${selectedDay.label} ${selectedDay.dayNumber} at ${formatSlotTime(row.startMinutes)} — ${STATE_LABEL[state].toLowerCase()}`}
                  onClick={(event) =>
                    onSelectDestination(
                      { date: selectedDate, startMinutes: row.startMinutes },
                      event.currentTarget
                    )
                  }
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2 text-sm transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    row.sessions.length > 0 && "mt-2",
                    state === "free" && "border-violet-300 text-violet-800 hover:bg-violet-50",
                    state === "conflict" && "border-rose-300 text-rose-700 hover:bg-rose-50",
                    state === "original" && "border-violet-500 bg-violet-50 text-violet-900"
                  )}
                >
                  <span className="font-medium tabular-nums">
                    {formatSlotTime(row.startMinutes)}
                  </span>
                  <span className="text-xs">{STATE_LABEL[state]}</span>
                </button>
              )}

              {row.isActionable && selectedDay && !state && (
                <button
                  type="button"
                  id={createPositionId("agenda", selectedDate, row.startMinutes)}
                  disabled={disabled}
                  aria-label={`Add a class on ${selectedDay.label} ${selectedDay.dayNumber} at ${formatSlotTime(row.startMinutes)}`}
                  onClick={(event) =>
                    onCreateAt(
                      {
                        date: selectedDate,
                        startMinutes: row.startMinutes,
                        dayLabel: `${selectedDay.label} ${selectedDay.dayNumber}`,
                      },
                      event.currentTarget
                    )
                  }
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2 text-sm transition-colors",
                    "hover:border-violet-300 hover:bg-violet-50",
                    "focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    row.sessions.length > 0 && "mt-2"
                  )}
                >
                  <span className="font-medium text-muted-foreground tabular-nums">
                    {formatSlotTime(row.startMinutes)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-violet-700">
                    <Plus className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
                    Add class
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  isBeingMoved,
  isMoving,
  onOpen,
}: {
  session: CalendarSession;
  isBeingMoved: boolean;
  isMoving: boolean;
  onOpen: (trigger: HTMLElement) => void;
}) {
  const isCancelled = session.status === "CANCELLED";
  const isCompleted = session.status === "COMPLETED";
  const tone = TONE_CLASSES[languageTone({ name: session.languageName })];
  const students =
    session.participants.map((participant) => participant.studentName).join(", ") || "Class";

  return (
    <button
      type="button"
      id={sessionCardId("agenda", session.id)}
      // In move mode the cards are context, not choices: the only thing to pick on
      // this screen is a destination.
      disabled={isMoving}
      onClick={(event) => onOpen(event.currentTarget)}
      className={cn(
        "w-full rounded-md border border-l-2 px-3 py-2 text-left transition-colors",
        "focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none",
        "not-first:mt-2",
        isMoving && !isBeingMoved && "opacity-50",
        isBeingMoved && "ring-2 ring-violet-600",
        isCancelled && "border-dashed border-l-muted-foreground/40 bg-muted/50",
        // Same language tones as the desktop grid; the badges below still say
        // the status in words, so colour is never the only signal.
        isCompleted && ["bg-muted/40", tone.line],
        !isCancelled && !isCompleted && [tone.surface, tone.line]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex min-w-0 items-center gap-1 text-sm font-medium",
            isCancelled && "text-muted-foreground line-through"
          )}
        >
          {isCompleted && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
          <span className="truncate">{students}</span>
        </span>
        {isCancelled && <Badge variant="outline">Cancelled</Badge>}
        {isCompleted && <Badge variant="default">Completed</Badge>}
      </div>

      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
        {session.startLabel} – {session.endLabel} · {session.durationMinutes} min
      </p>
      <p className="text-xs text-muted-foreground">
        {session.teacherName} · {session.languageName}
      </p>
    </button>
  );
}
