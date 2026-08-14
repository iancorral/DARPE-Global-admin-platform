"use client";

import { Check, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  buildAgendaRows,
  classifyDestination,
  formatSlotTime,
  type CreationSlot,
  type DestinationState,
  type MinuteRange,
} from "../scheduling";
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
  onOpenSession: (session: CalendarSession) => void;
  onSelectDestination: (slot: DestinationSlot) => void;
  onCreateAt: (slot: CreationSlot) => void;
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

  return (
    <div className="rounded-xl border bg-card">
      <div
        role="tablist"
        aria-label="Day of the week"
        className="flex gap-1 overflow-x-auto border-b p-2"
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

      <div className="divide-y">
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
            <div key={row.startMinutes} className="p-2">
              {row.sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isBeingMoved={movingSession?.id === session.id}
                  isMoving={isMoving}
                  onOpen={() => onOpenSession(session)}
                />
              ))}

              {row.isActionable && selectedDay && state && (
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Move to ${selectedDay.label} ${selectedDay.dayNumber} at ${formatSlotTime(row.startMinutes)} — ${STATE_LABEL[state].toLowerCase()}`}
                  onClick={() =>
                    onSelectDestination({ date: selectedDate, startMinutes: row.startMinutes })
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
                  disabled={disabled}
                  aria-label={`Add a class on ${selectedDay.label} ${selectedDay.dayNumber} at ${formatSlotTime(row.startMinutes)}`}
                  onClick={() =>
                    onCreateAt({
                      date: selectedDate,
                      startMinutes: row.startMinutes,
                      dayLabel: `${selectedDay.label} ${selectedDay.dayNumber}`,
                    })
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
  onOpen: () => void;
}) {
  const isCancelled = session.status === "CANCELLED";
  const isCompleted = session.status === "COMPLETED";
  const students =
    session.participants.map((participant) => participant.studentName).join(", ") || "Class";

  return (
    <button
      type="button"
      // In move mode the cards are context, not choices: the only thing to pick on
      // this screen is a destination.
      disabled={isMoving}
      onClick={onOpen}
      className={cn(
        "w-full rounded-md border border-l-2 px-3 py-2 text-left transition-colors",
        "focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none",
        "not-first:mt-2",
        isMoving && !isBeingMoved && "opacity-50",
        isBeingMoved && "ring-2 ring-violet-600",
        isCancelled && "border-dashed border-l-muted-foreground/40 bg-muted/50",
        isCompleted && "border-l-muted-foreground/30 bg-muted/30",
        !isCancelled && !isCompleted && "border-l-violet-500 bg-card"
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
