"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { placeDaySessions } from "../layout";
import {
  formatSlotTime,
  moveGridFocus,
  offsetFromMinutes,
  type CreationSlot,
  type MinuteRange,
} from "../scheduling";
import { MoveDestinations, slotDomId, type DestinationSlot } from "./move-destinations";
import { CreatePositions, createSlotDomId, type CreatePosition } from "./create-positions";
import { sessionCardId } from "../element-ids";
import type { CalendarSession, MovingSession } from "../queries";
import type { CalendarDay } from "./calendar-day";

const HOUR_HEIGHT = 56;
/** Move mode stretches the grid so half-hour targets stay comfortably clickable. */
const MOVE_HOUR_HEIGHT = 80;
/**
 * The strip along each day column that session cards leave free.
 *
 * It is what keeps "add a class here" reachable at a time somebody already has a
 * class: the cards are inset by it, so every position keeps a piece of itself that
 * a card can never cover.
 */
const CREATE_GUTTER = 24;

type Props = {
  days: CalendarDay[];
  sessions: CalendarSession[];
  hours: number[];
  dayStartMinutes: number;
  movingSession: MovingSession | null;
  destinationStarts: number[];
  creationStarts: number[];
  showsCreation: boolean;
  occupiedOn: (date: string) => MinuteRange[];
  originalStartOn: (date: string) => number | null;
  active: DestinationSlot | null;
  disabled: boolean;
  /** Each handler is handed the button pressed, so focus can return to it. */
  onOpenSession: (session: CalendarSession, trigger: HTMLElement) => void;
  onActivate: (slot: DestinationSlot) => void;
  onSelectDestination: (slot: DestinationSlot, trigger: HTMLElement) => void;
  onCreateAt: (slot: CreationSlot, trigger: HTMLElement) => void;
  onExitMoveMode: () => void;
};

/**
 * The Monday–Saturday week grid, shown from `lg` up.
 *
 * Sessions sit at their real time and length, and in move mode every destination
 * is a real button laid over the same grid, so a move is chosen where the week is
 * already being read rather than in a separate mode-specific screen.
 */
export function WeekGrid({
  days,
  sessions,
  hours,
  dayStartMinutes,
  movingSession,
  destinationStarts,
  creationStarts,
  showsCreation,
  occupiedOn,
  originalStartOn,
  active,
  disabled,
  onOpenSession,
  onActivate,
  onSelectDestination,
  onCreateAt,
  onExitMoveMode,
}: Props) {
  const isMoving = movingSession !== null;
  const hourHeight = isMoving ? MOVE_HOUR_HEIGHT : HOUR_HEIGHT;
  const gridHeight = hours.length * hourHeight;

  const gridRef = useRef<HTMLDivElement>(null);
  const [createFocus, setCreateFocus] = useState<CreatePosition | null>(null);

  const firstDestination: DestinationSlot | null =
    isMoving && days[0] && destinationStarts[0] !== undefined
      ? { date: days[0].date, startMinutes: destinationStarts[0] }
      : null;
  const tabbable = active ?? firstDestination;

  // The one creation position in the tab order: wherever focus last was, or the
  // first position of the week before it has been anywhere.
  const firstCreatePosition: CreatePosition | null =
    showsCreation && days[0] && creationStarts[0] !== undefined
      ? { date: days[0].date, startMinutes: creationStarts[0] }
      : null;
  const createTabbable = createFocus ?? firstCreatePosition;

  /**
   * Arrow keys walk whichever layer of positions the grid is currently offering,
   * so a week is one tab stop rather than several hundred. Both layers share
   * `moveGridFocus`, so they cannot start behaving differently under the same keys.
   */
  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const starts = isMoving ? destinationStarts : creationStarts;
    const current = isMoving ? active : createFocus;

    if (starts.length === 0 || !current) return;

    if (event.key === "Escape") {
      if (isMoving) {
        onExitMoveMode();
        return;
      }

      // Leaving the positions rather than activating one: focus lands on the grid
      // itself, so the next Tab continues past the calendar instead of dropping
      // to the top of the page.
      event.preventDefault();
      gridRef.current?.focus();
      return;
    }

    const dayIndex = days.findIndex((day) => day.date === current.date);
    if (dayIndex === -1) return;

    const next = moveGridFocus(
      { dayIndex, startMinutes: current.startMinutes },
      event.key,
      days.length,
      starts
    );
    if (!next) return;

    event.preventDefault();
    const target = {
      date: days[next.dayIndex]?.date ?? current.date,
      startMinutes: next.startMinutes,
    };

    if (isMoving) {
      onActivate(target);
      document.getElementById(slotDomId(target))?.focus();
      return;
    }

    setCreateFocus(target);
    document.getElementById(createSlotDomId(target))?.focus();
  }

  return (
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
          ref={gridRef}
          // Focusable only as a place for Escape to land, never as a tab stop.
          tabIndex={-1}
          role="group"
          aria-label="Week grid"
          className="grid focus:outline-none"
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

                {showsCreation && (
                  <CreatePositions
                    date={day.date}
                    dayLabel={`${day.label} ${day.dayNumber}`}
                    starts={creationStarts}
                    daySessions={daySessions}
                    dayStartMinutes={dayStartMinutes}
                    pixelsPerHour={hourHeight}
                    tabbable={createTabbable}
                    onFocusPosition={setCreateFocus}
                    onSelect={onCreateAt}
                  />
                )}

                {/*
                  Inset from the right so the creation strip underneath always keeps
                  a piece of every position clickable. The cards sit above it, so
                  clicking a class opens the class rather than creating one — but the
                  wrapper itself must not catch anything, or it would swallow the
                  empty space between classes that creation relies on.
                */}
                <div
                  className="pointer-events-none absolute inset-y-0 left-0"
                  style={{ right: showsCreation ? CREATE_GUTTER : 0 }}
                >
                {placements.map((placement) => {
                  const session = daySessions.find((s) => s.id === placement.id);
                  if (!session) return null;
                  const isCancelled = session.status === "CANCELLED";
                  const isCompleted = session.status === "COMPLETED";
                  const isBeingMoved = movingSession?.id === session.id;

                  return (
                    <button
                      key={session.id}
                      id={sessionCardId("grid", session.id)}
                      type="button"
                      // During move mode the cards step aside so every destination
                      // underneath stays reachable by pointer and touch.
                      disabled={isMoving}
                      aria-hidden={isMoving ? true : undefined}
                      onClick={(event) => onOpenSession(session, event.currentTarget)}
                      className={cn(
                        "pointer-events-auto absolute overflow-hidden rounded-md border border-l-2 px-2 py-1 text-left transition-colors",
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
                </div>

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
                    disabled={disabled}
                    onActivate={onActivate}
                    onSelect={onSelectDestination}
                  />
                )}

                {showsPreview && movingSession && active && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-1 left-1 z-30 rounded-md border-2 border-violet-600 bg-violet-200/50 px-2 py-0.5 text-[10px] font-medium text-violet-900"
                    style={{
                      top: offsetFromMinutes(active.startMinutes, dayStartMinutes, hourHeight),
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
  );
}
