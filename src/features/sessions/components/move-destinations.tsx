"use client";

import { cn } from "@/lib/utils";
import {
  SCHEDULING_INTERVAL_MINUTES,
  classifyDestination,
  formatSlotTime,
  offsetFromMinutes,
  type DestinationState,
  type MinuteRange,
} from "../scheduling";

export type DestinationSlot = {
  date: string;
  startMinutes: number;
};

const STATE_LABEL: Record<DestinationState, string> = {
  original: "current time of this class",
  conflict: "teacher already has a class",
  free: "available",
};

type Props = {
  date: string;
  dayLabel: string;
  slotStarts: number[];
  durationMinutes: number;
  /** The teacher's other classes on this day, as minutes within the day. */
  occupied: MinuteRange[];
  /** Where the class currently sits, when it sits on this day. */
  originalStartMinutes: number | null;
  dayStartMinutes: number;
  pixelsPerHour: number;
  active: DestinationSlot | null;
  tabbable: DestinationSlot | null;
  disabled: boolean;
  onActivate: (slot: DestinationSlot) => void;
  onSelect: (slot: DestinationSlot) => void;
};

export function slotDomId(slot: DestinationSlot): string {
  return `move-slot-${slot.date}-${slot.startMinutes}`;
}

/**
 * One day column's worth of destinations while move mode is active.
 *
 * Every slot is a real button, so pointer, touch and keyboard all reach the same
 * targets. Only one slot is tabbable at a time; the grid moves focus between them
 * with the arrow keys, which keeps a full week from becoming hundreds of tab stops.
 *
 * State is never carried by colour alone — each slot's accessible name says what it
 * is, and conflicting slots also carry a distinct border and a struck-through marker.
 */
export function MoveDestinations({
  date,
  dayLabel,
  slotStarts,
  durationMinutes,
  occupied,
  originalStartMinutes,
  dayStartMinutes,
  pixelsPerHour,
  active,
  tabbable,
  disabled,
  onActivate,
  onSelect,
}: Props) {
  const slotHeight = (SCHEDULING_INTERVAL_MINUTES / 60) * pixelsPerHour;

  return (
    <>
      {slotStarts.map((startMinutes) => {
        const state = classifyDestination(
          { startMinutes, durationMinutes },
          occupied,
          originalStartMinutes
        );
        const slot = { date, startMinutes };
        const isActive = active?.date === date && active.startMinutes === startMinutes;
        const isTabbable =
          tabbable?.date === date && tabbable.startMinutes === startMinutes;

        return (
          <button
            key={startMinutes}
            id={slotDomId(slot)}
            type="button"
            disabled={disabled}
            tabIndex={isTabbable ? 0 : -1}
            aria-label={`Move to ${dayLabel} at ${formatSlotTime(startMinutes)} — ${STATE_LABEL[state]}`}
            onMouseEnter={() => onActivate(slot)}
            onFocus={() => onActivate(slot)}
            onClick={() => onSelect(slot)}
            className={cn(
              "absolute right-0 left-0 z-20 border-t border-dashed transition-colors",
              "focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-inset focus-visible:outline-none",
              state === "free" && "border-violet-300/70 hover:bg-violet-100/70",
              state === "conflict" && "border-rose-300 hover:bg-rose-100/60",
              state === "original" && "border-violet-500 bg-violet-100/40",
              isActive && state === "free" && "bg-violet-100/70",
              isActive && state === "conflict" && "bg-rose-100/60"
            )}
            style={{
              top: offsetFromMinutes(startMinutes, dayStartMinutes, pixelsPerHour),
              height: slotHeight,
            }}
          >
            {state === "conflict" && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-1 flex items-center text-[9px] font-semibold text-rose-600"
              >
                ×
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}
