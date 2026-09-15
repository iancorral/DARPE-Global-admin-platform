"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  WEEKDAY_INITIALS,
  displayDate,
  monthGrid,
  monthLabel,
  shiftMonth,
} from "@/lib/month-grid";
import { cn } from "@/lib/utils";

const PANEL_WIDTH = 288;
const PANEL_HEIGHT = 340;
const GAP = 6;

/**
 * The date control for the whole product.
 *
 * Replaces `<input type="date">`, which renders a different widget in every
 * browser, none of them matching anything else on the page.
 *
 * The calendar is portalled to `<body>` and positioned `fixed`. It has to be:
 * an absolutely positioned panel is clipped by any ancestor that scrolls or
 * hides overflow, and inside a dialog — which does both — it came out sliced in
 * half with the dialog's own scrollbars trying to reach it.
 *
 * Values are plain YYYY-MM-DD strings in and out. Nothing here constructs a
 * `Date`, so no date can shift by a day on the way through a timezone.
 */
export function DateField({
  id,
  value,
  onChange,
  min,
  placeholder = "Pick a date",
  clearable = false,
  className,
  ariaLabel,
}: {
  id?: string;
  /** YYYY-MM-DD, or "" for no date. */
  value: string;
  onChange: (next: string) => void;
  /** Earliest selectable date, YYYY-MM-DD. Earlier days render disabled. */
  min?: string;
  placeholder?: string;
  /** Adds a "Clear" action, for a genuinely optional date. */
  clearable?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  /*
   * Only set while paging through months. The month on show is otherwise
   * derived from the value, so a date set from outside is always the one the
   * calendar opens on — without an effect syncing one piece of state to
   * another, which is a render loop waiting to happen.
   */
  const [browsing, setBrowsing] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const month = browsing ?? value ?? "";
  const today = todayish();
  const cells = monthGrid(month || today);

  // Placed before paint so the panel never appears in the wrong spot first.
  useLayoutEffect(() => {
    if (!isOpen) return;

    const place = () => {
      const box = trigger.current?.getBoundingClientRect();
      if (!box) return;

      // Flip above the field when there is no room below, and keep the panel
      // inside the viewport horizontally.
      const below = window.innerHeight - box.bottom;
      const top =
        below < PANEL_HEIGHT + GAP && box.top > below
          ? box.top - PANEL_HEIGHT - GAP
          : box.bottom + GAP;

      setPosition({
        top: Math.max(GAP, top),
        left: Math.min(Math.max(GAP, box.left), window.innerWidth - PANEL_WIDTH - GAP),
      });
    };

    place();
    window.addEventListener("resize", place);
    // `true` catches scrolling in any ancestor, not just the window.
    window.addEventListener("scroll", place, true);

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (trigger.current?.contains(target) || panel.current?.contains(target)) return;
      setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsOpen(false);
        trigger.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    // Capture phase, so Escape closes the calendar before a dialog around it.
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [isOpen]);

  const pick = (date: string) => {
    onChange(date);
    setIsOpen(false);
    trigger.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <button
        ref={trigger}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => {
          // Reopening always starts from the current value, never from
          // wherever the last visit happened to leave off.
          setBrowsing(null);
          setIsOpen((open) => !open);
        }}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm",
          "cursor-pointer transition-colors hover:border-primary/40",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          "motion-reduce:transition-none",
          !value && "text-muted-foreground"
        )}
      >
        <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{value ? displayDate(value) : placeholder}</span>
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-label="Choose a date"
            style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
            className="fixed z-[60] rounded-xl border bg-popover p-3 shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <MonthButton
                label="Previous month"
                onClick={() => setBrowsing(shiftMonth(month || today, -1))}
                icon={ChevronLeft}
              />
              <span aria-live="polite" className="text-sm font-medium">
                {monthLabel(month || today)}
              </span>
              <MonthButton
                label="Next month"
                onClick={() => setBrowsing(shiftMonth(month || today, 1))}
                icon={ChevronRight}
              />
            </div>

            <div aria-hidden="true" className="grid grid-cols-7 gap-0.5 pb-1">
              {WEEKDAY_INITIALS.map((initial, index) => (
                <span
                  key={index}
                  className="py-1 text-center text-[11px] font-medium text-muted-foreground"
                >
                  {initial}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((cell) => {
                const isSelected = cell.date === value;
                const isToday = cell.date === today;
                const disabled = min ? cell.date < min : false;

                return (
                  <button
                    key={cell.date}
                    type="button"
                    disabled={disabled}
                    aria-pressed={isSelected}
                    aria-label={displayDate(cell.date)}
                    onClick={() => pick(cell.date)}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-md text-sm tabular-nums",
                      "transition-colors focus-visible:outline-none focus-visible:ring-2",
                      "focus-visible:ring-ring motion-reduce:transition-none",
                      disabled && "cursor-not-allowed opacity-30",
                      !disabled && "cursor-pointer hover:bg-accent",
                      !cell.inMonth && !isSelected && "text-muted-foreground/50",
                      isToday && !isSelected && "font-semibold text-primary",
                      isSelected &&
                        "bg-primary font-medium text-primary-foreground hover:bg-primary"
                    )}
                  >
                    {Number(cell.date.slice(8, 10))}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <button
                type="button"
                onClick={() => pick(today)}
                className="cursor-pointer rounded px-1.5 py-1 text-xs font-medium text-primary hover:underline"
              >
                Today
              </button>
              {clearable && value && (
                <button
                  type="button"
                  onClick={() => pick("")}
                  className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X aria-hidden="true" className="size-3" /> Clear
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function MonthButton({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon: typeof ChevronLeft;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}

/**
 * Today as the browser sees it, only ever used to open the picker somewhere
 * sensible and to mark today's cell. Every value that is stored comes from a
 * cell the user clicked, so the browser's timezone never reaches the database.
 */
function todayish(): string {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}
