"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { placeDaySessions, visibleHourRange } from "../layout";
import { SessionDialog } from "./session-dialog";
import type { CalendarSession } from "../queries";

const HOUR_HEIGHT = 56;

export type CalendarDay = {
  date: string;
  label: string;
  dayNumber: string;
  isToday: boolean;
};

type Props = {
  days: CalendarDay[];
  sessions: CalendarSession[];
};

export function WeekCalendar({ days, sessions }: Props) {
  const [selected, setSelected] = useState<CalendarSession | null>(null);

  const { startHour, endHour } = visibleHourRange(sessions);
  const dayStartMinutes = startHour * 60;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = hours.length * HOUR_HEIGHT;

  return (
    <>
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
          >
            <div style={{ height: gridHeight }}>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="relative pr-2 text-right text-[10px] text-muted-foreground"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className="absolute top-0 right-2 -translate-y-1/2">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {days.map((day) => {
              const daySessions = sessions.filter((session) => session.date === day.date);
              const placements = placeDaySessions(daySessions, dayStartMinutes, HOUR_HEIGHT);

              return (
                <div
                  key={day.date}
                  className={cn("relative border-l", day.isToday && "bg-violet-50/40")}
                  style={{ height: gridHeight }}
                >
                  {hours.map((hour) => (
                    <div key={hour} className="border-b border-border/50" style={{ height: HOUR_HEIGHT }} />
                  ))}

                  {placements.map((placement) => {
                    const session = daySessions.find((s) => s.id === placement.id);
                    if (!session) return null;
                    const isCancelled = session.status === "CANCELLED";

                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setSelected(session)}
                        className={cn(
                          "absolute overflow-hidden rounded-md border border-l-2 px-2 py-1 text-left transition-colors",
                          isCancelled
                            ? "border-dashed border-l-muted-foreground/40 bg-muted/50 text-muted-foreground hover:bg-muted"
                            : "border-l-violet-500 bg-card hover:border-violet-300 hover:bg-violet-50"
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
                            "block truncate text-[11px] font-medium",
                            isCancelled ? "line-through" : "text-foreground"
                          )}
                        >
                          {session.studentNames[0] ?? "Class"}
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
              );
            })}
          </div>
        </div>
      </div>

      <SessionDialog session={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </>
  );
}
