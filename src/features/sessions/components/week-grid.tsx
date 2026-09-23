"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_CLASSES, languageCode, languageTone } from "@/lib/tone";
import { placeDaySessions } from "../layout";
import { isOutsideBusinessHour, type BusinessHours } from "../business-hours";
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
import { sessionTitle } from "../session-title";
import type { CalendarSession, MovingSession } from "../queries";
import type { CalendarDay } from "./calendar-day";

/*
 * How tall an hour is: as tall as the screen allows, between these two.
 *
 * The grid measures the space left below it and divides it by the hours on
 * show, so on a large monitor the whole teaching day fits without scrolling.
 * It never grows past 60px — a card holds its three lines by then, and more
 * height is only empty space — and never shrinks below 42px, where a one-hour
 * card still holds a name and a time. 42 rather than a rounder number because
 * it is what lets a 1440×900 laptop, the most common screen in the office, show
 * the whole day. A screen too short for that scrolls inside the grid.
 */
const MAX_HOUR_HEIGHT = 60;
const MIN_HOUR_HEIGHT = 42;
/** The grid's border plus a little rounding, so a fitted day never scrolls by a hair. */
const GRID_FRAME = 4;
/** The grid's top padding, which keeps the first hour label clear of the header. */
const GRID_TOP_PADDING = 10;
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
  /** The academy's teaching day, from Settings. */
  businessHours: BusinessHours;
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
  businessHours,
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
  const hourCount = Math.max(1, hours.length);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ hourHeight: number; maxHeight: number } | null>(null);

  /*
   * Measured after layout and before paint, then again whenever the window
   * changes size. Skipped while the grid is hidden: below `lg` the phone agenda
   * is on screen instead, and a hidden element measures as zero.
   */
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    function measure() {
      if (!scroller || scroller.offsetParent === null) return;

      const main = scroller.closest("main");
      const page = main?.firstElementChild;
      if (!main || !page) return;

      const scrollerRect = scroller.getBoundingClientRect();
      // From the top of the scrolling area rather than the viewport, so a page
      // that has already been scrolled measures the same as one that has not.
      const top = scrollerRect.top - main.getBoundingClientRect().top + main.scrollTop;
      // Whatever sits under the grid — the legend, the page's own padding — as it
      // actually measures. A fixed allowance was off by a few pixels, which was
      // enough to leave a scrollbar on a day that otherwise fitted.
      const below = page.getBoundingClientRect().bottom - scrollerRect.bottom;
      const available = Math.floor(main.clientHeight - top - below);
      const header = headerRef.current?.offsetHeight ?? 0;
      const perHour = Math.floor(
        (available - header - GRID_TOP_PADDING - GRID_FRAME) / hourCount
      );

      setFit({
        hourHeight: Math.max(MIN_HOUR_HEIGHT, Math.min(MAX_HOUR_HEIGHT, perHour)),
        maxHeight: Math.max(320, available),
      });
    }

    measure();
    // Again once the web fonts are in: the day headers use the display face,
    // and swapping it in changes their height after the first measure.
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) measure();
    });
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
    };
  }, [hourCount, isMoving]);

  const hourHeight = isMoving ? MOVE_HOUR_HEIGHT : (fit?.hourHeight ?? MAX_HOUR_HEIGHT);
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
    /*
     * Bounded to the viewport and scrolled internally, the way a calendar
     * application behaves: the week always fits the screen whatever the laptop,
     * and the day headers stay put while the hours move under them. Growing to
     * the full height of the day instead pushed the page into a scroll that
     * took the headers with it.
     */
    <div
      ref={scrollerRef}
      className="w-full overflow-auto rounded-xl border bg-card shadow-xs lg:max-h-[calc(100dvh-14rem)]"
      // The measured bound replaces the CSS estimate as soon as it is known.
      style={fit ? { maxHeight: fit.maxHeight } : undefined}
    >
      <div className="w-full min-w-215">
        <div
          ref={headerRef}
          className="sticky top-0 z-20 grid border-b bg-card"
          style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div />
          {days.map((day) => (
            <div
              key={day.date}
              className={cn(
                "border-l px-2 py-2.5 text-center",
                // Today's header gets a tint and a rule under it; the column
                // itself stays plain, so the marker says "this is today"
                // without painting a seventh of the week violet.
                day.isToday && "border-b-2 border-b-primary bg-primary/8"
              )}
            >
              <span
                className={cn(
                  "inline-flex items-baseline gap-1.5 rounded-full px-2.5 py-1",
                  day.isToday && "bg-primary text-primary-foreground shadow-xs"
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-semibold tracking-wide uppercase",
                    !day.isToday && "text-muted-foreground"
                  )}
                >
                  {day.label}
                </span>
                <span className="font-serif text-base font-semibold">{day.dayNumber}</span>
                {day.isToday && <span className="sr-only">(today)</span>}
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
          // The first hour label is centred on the grid's top edge, so half of
          // it used to sit under the sticky header. This gives it room.
          style={{
            gridTemplateColumns: `48px repeat(${days.length}, minmax(0, 1fr))`,
            paddingTop: GRID_TOP_PADDING,
          }}
          onKeyDown={handleGridKeyDown}
        >
          <div style={{ height: gridHeight }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className={cn(
                  "relative pr-2 text-right text-[11px] tabular-nums",
                  isOutsideBusinessHour(hour, businessHours)
                    ? "font-normal text-muted-foreground/60"
                    : "font-medium text-muted-foreground"
                )}
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
                className="relative border-l"
                style={{ height: gridHeight }}
              >
                {/*
                  A hairline at the top of today's column, not a wash over it.
                  An overlay rather than a top border: a border takes 2px out of a
                  column whose hour rows already add up to its full height, and
                  those 2px gave a day that fitted the screen a scrollbar.
                */}
                {day.isToday && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 bg-primary"
                  />
                )}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    // Outside the academy's normal day: still fully bookable,
                    // just quieter, so the working day is legible at a glance.
                    className={cn(
                      "border-b border-border/50",
                      isOutsideBusinessHour(hour, businessHours) && "bg-muted/40"
                    )}
                    style={{ height: hourHeight }}
                  />
                ))}

                {showsCreation && (
                  <CreatePositions
                    date={day.date}
                    dayLabel={`${day.label} ${day.dayNumber}`}
                    starts={creationStarts}
                    businessHours={businessHours}
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
                  // The language colours the card; the status decides how alive
                  // it looks. A cancelled class drops the colour entirely so it
                  // cannot be mistaken for one that is still happening.
                  const tone = TONE_CLASSES[languageTone({ name: session.languageName })];

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
                        "pointer-events-auto absolute overflow-hidden rounded-lg border border-l-4 px-2 py-0.5 text-left leading-tight transition-shadow motion-reduce:transition-none",
                        isMoving && "pointer-events-none",
                        isMoving && !isBeingMoved && "opacity-40",
                        isBeingMoved && "z-10 ring-2 ring-violet-600 ring-offset-1",
                        isCancelled &&
                          "border-dashed border-l-muted-foreground/40 bg-muted/50 text-muted-foreground hover:bg-muted",
                        // Completed keeps its language marker but sits back:
                        // muted surface, and the tick below says why.
                        isCompleted && ["bg-muted/40 text-muted-foreground", tone.line],
                        !isCancelled && !isCompleted && [
                          tone.surface,
                          tone.line,
                          "hover:shadow-xs motion-reduce:transition-none",
                        ]
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
                          "flex items-center gap-1 truncate text-[13px] leading-tight font-semibold",
                          isCancelled && "line-through",
                          !isCancelled && !isCompleted && "text-foreground"
                        )}
                      >
                        {isCompleted && <Check className="size-3.5 shrink-0" />}
                        {/* Marks a group at a glance, the way the timetable's "Grupo" does. */}
                        {!isCompleted && session.groupName && (
                          <UsersRound aria-hidden="true" className="size-3.5 shrink-0" />
                        )}
                        <span className="truncate">{sessionTitle(session)}</span>
                        {/*
                          The language in letters as well as colour, so EN and FR
                          never depend on telling two tints apart. Left out of a
                          card sharing its column, where the name needs the room.
                        */}
                        {placement.widthPercent > 50 && (
                          <span
                            className={cn(
                              "ml-auto shrink-0 rounded px-1 py-px text-[10px] leading-none font-bold tracking-wide",
                              isCancelled || isCompleted
                                ? "bg-muted text-muted-foreground"
                                : ["bg-white/75", tone.text]
                            )}
                          >
                            {languageCode({ name: session.languageName })}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {session.startLabel} · {session.teacherName.split(" ")[0]}
                      </span>
                      {placement.height > 58 && (
                        <span className="block truncate text-[11px] text-muted-foreground">
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
