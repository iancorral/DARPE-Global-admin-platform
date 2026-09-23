import Link from "next/link";
import { Check, ChevronRight, UsersRound } from "lucide-react";
import { DashboardCard } from "@/components/shared/page";
import { TONE_CLASSES, languageCode, languageTone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { DASHBOARD_COPY } from "../copy";
import type { DashboardSession } from "../queries";
import { timelinePhases, type TimelinePhase } from "../timeline";

/**
 * Today as a timeline — the "Up next" view of Google Calendar's schedule and
 * Apple's Calendar widget, rather than another list of rows.
 *
 * It used to be the same row component as "Needs attention", so the two cards
 * read as one thing twice. Here time runs down a rail: what has ended fades,
 * the class running now is lifted onto its language's colour with a "Now"
 * label, and exactly one upcoming class says "Next". Staff open the dashboard
 * and see where the day is without reading a single time.
 */
export function TodayTimeline({
  sessions,
  todayLabel,
  calendarHref,
  nowMs,
  className,
}: {
  sessions: DashboardSession[];
  todayLabel: string;
  calendarHref: string;
  nowMs: number;
  className?: string;
}) {
  const phases = timelinePhases(sessions, nowMs);

  return (
    <DashboardCard
      title={DASHBOARD_COPY.todayTitle}
      description={
        sessions.length === 0
          ? todayLabel
          : `${todayLabel} · ${DASHBOARD_COPY.todayCount(sessions.length)}`
      }
      action={
        <Link
          href={calendarHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View calendar <ChevronRight aria-hidden="true" className="size-3.5" />
        </Link>
      }
      // A column that fills whatever height its row gives it, with the list
      // scrolling inside once a busy day outgrows it — so the card beside it
      // never has to stretch to match.
      className={cn("flex flex-col", className)}
      bodyClassName="min-h-0 flex-1 overflow-y-auto px-3 pb-3"
    >
      {sessions.length === 0 ? (
        <p className="px-2 pb-2 text-sm text-muted-foreground">{DASHBOARD_COPY.todayEmpty}</p>
      ) : (
        <ol>
          {sessions.map((session, index) => (
            <TimelineRow
              key={session.id}
              session={session}
              phase={phases[index] ?? "later"}
            />
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}

function TimelineRow({ session, phase }: { session: DashboardSession; phase: TimelinePhase }) {
  const tone = TONE_CLASSES[languageTone({ name: session.languageName })];
  const isCancelled = session.status === "CANCELLED";
  const isCompleted = session.status === "COMPLETED";
  const isNow = phase === "now";
  const isPast = phase === "past";

  return (
    <li className="group/row flex items-stretch gap-3">
      <div
        className={cn(
          "w-10 shrink-0 pt-2 text-right text-xs font-semibold tabular-nums",
          isPast && "opacity-55"
        )}
      >
        {session.startLabel}
      </div>

      {/* The rail. It starts at the first node and stops at the last. */}
      <div aria-hidden="true" className="relative flex w-2 shrink-0 justify-center">
        <span className="absolute inset-y-0 w-px bg-border group-first/row:top-3 group-last/row:bottom-auto group-last/row:h-3" />
        <span
          className={cn(
            "relative mt-2.5 size-2 rounded-full ring-4 ring-card",
            isPast || isCancelled ? "bg-muted-foreground/30" : tone.dot,
            isNow && "size-2.5 mt-2"
          )}
        />
      </div>

      {/* One line per class: the day has to be readable in a glance, not scrolled. */}
      <Link
        href={session.weekHref}
        className={cn(
          "group flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors motion-reduce:transition-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          isNow ? [tone.surface, "hover:brightness-[0.98]"] : "hover:bg-muted/60",
          isPast && "opacity-55 hover:opacity-100"
        )}
      >
        {session.isGroup && (
          <UsersRound aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span
          className={cn(
            "min-w-0 truncate font-medium group-hover:underline",
            isCancelled && "text-muted-foreground line-through"
          )}
        >
          {session.title}
        </span>
        <span
          className={cn(
            "shrink-0 rounded px-1 py-px text-[10px] leading-none font-bold tracking-wide",
            tone.surface,
            tone.text,
            isNow && "bg-white/75"
          )}
        >
          {languageCode({ name: session.languageName })}
        </span>
        {/*
          Right beside the class, not pushed to the far edge: a name at each end
          of a wide row left a gap the eye had to cross to pair them up.
        */}
        <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">
          {`· ${session.teacherName}`}
        </span>
        <PhaseLabel phase={phase} isCompleted={isCompleted} isCancelled={isCancelled} />
      </Link>
    </li>
  );
}

/** One word at most, and only where it says something the rail does not. */
function PhaseLabel({
  phase,
  isCompleted,
  isCancelled,
}: {
  phase: TimelinePhase;
  isCompleted: boolean;
  isCancelled: boolean;
}) {
  // Pinned to the row's right edge, where the eye looks for a status.
  if (isCancelled) {
    return (
      <span className="shrink-0 text-xs text-muted-foreground ml-auto">Cancelled</span>
    );
  }
  if (isCompleted) {
    return (
      <Check
        aria-label="Done"
        className="size-4 shrink-0 text-tone-teal-fg ml-auto"
      />
    );
  }
  if (phase === "now") {
    return (
      <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground ml-auto">
        Now
      </span>
    );
  }
  if (phase === "next") {
    return (
      <span className="shrink-0 rounded-full border border-primary/30 px-1.5 py-0.5 text-[10px] font-semibold text-primary ml-auto">
        Next
      </span>
    );
  }
  return null;
}
