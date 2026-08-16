"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SCHEDULING_INTERVAL_MINUTES,
  formatSlotTime,
  isPositionCovered,
  offsetFromMinutes,
  type CreationSlot,
  type MinuteRange,
} from "../scheduling";
import { createPositionId } from "../element-ids";

export type CreatePosition = {
  date: string;
  startMinutes: number;
};

/**
 * This grid's id for a position. Scoped to the grid, because the agenda draws the
 * same date and time and both trees are mounted at once.
 */
export function createSlotDomId(position: CreatePosition): string {
  return createPositionId("grid", position.date, position.startMinutes);
}

type Props = {
  date: string;
  dayLabel: string;
  starts: number[];
  /** The classes drawn on this day, used only to place the label clear of them. */
  daySessions: MinuteRange[];
  dayStartMinutes: number;
  pixelsPerHour: number;
  /** The one position in the whole grid that is in the tab order. */
  tabbable: CreatePosition | null;
  onFocusPosition: (position: CreatePosition) => void;
  /** The button is handed over so focus can return to this exact control. */
  onSelect: (slot: CreationSlot, trigger: HTMLElement) => void;
};

/**
 * One day column's worth of "start a class here" positions, while browsing.
 *
 * These sit underneath the session cards, so a click on a class still opens that
 * class and only the free part of a position creates. Every position keeps a
 * clickable strip in the column's right-hand gutter, which the cards are inset
 * from — so a time is never unreachable just because somebody's class is drawn
 * across it. Two teachers can both teach at 09:00, and the calendar has no opinion
 * about whether the one you are about to pick is free: the server decides that.
 *
 * A week holds a few hundred of these, so only one is ever in the tab order and
 * the arrow keys move between the rest. Tab therefore reaches the calendar in one
 * step and leaves it in one step, and the session cards keep their own tab stops.
 */
export function CreatePositions({
  date,
  dayLabel,
  starts,
  daySessions,
  dayStartMinutes,
  pixelsPerHour,
  tabbable,
  onFocusPosition,
  onSelect,
}: Props) {
  const rowHeight = (SCHEDULING_INTERVAL_MINUTES / 60) * pixelsPerHour;

  return (
    <>
      {starts.map((startMinutes) => {
        const time = formatSlotTime(startMinutes);
        // Only decides where there is room for the wording, never whether this
        // position may be used.
        const covered = isPositionCovered(startMinutes, daySessions);
        const position = { date, startMinutes };
        const isTabbable =
          tabbable?.date === date && tabbable.startMinutes === startMinutes;

        return (
          <button
            key={startMinutes}
            id={createSlotDomId(position)}
            type="button"
            tabIndex={isTabbable ? 0 : -1}
            aria-label={`Add a class on ${dayLabel} at ${time}`}
            onFocus={() => onFocusPosition(position)}
            onClick={(event) =>
              onSelect({ date, startMinutes, dayLabel }, event.currentTarget)
            }
            className={cn(
              "group absolute right-0 left-0 z-0 flex items-center transition-colors",
              "hover:bg-violet-50/80",
              "focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-inset focus-visible:outline-none"
            )}
            style={{
              top: offsetFromMinutes(startMinutes, dayStartMinutes, pixelsPerHour),
              height: rowHeight,
            }}
          >
            {!covered && (
              <span
                aria-hidden="true"
                className="ml-1.5 flex items-center gap-1 truncate text-[10px] font-medium text-violet-700 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <Plus className="size-3 shrink-0" strokeWidth={2.2} />
                Add class
              </span>
            )}

            <span
              aria-hidden="true"
              className="absolute inset-y-0 right-0 flex w-6 items-center justify-center text-violet-700 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              <Plus className="size-3.5" strokeWidth={2.2} />
            </span>
          </button>
        );
      })}
    </>
  );
}
