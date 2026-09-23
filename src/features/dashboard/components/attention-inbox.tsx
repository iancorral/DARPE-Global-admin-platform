import Link from "next/link";
import { AlertCircle, ArrowRight, CircleCheck } from "lucide-react";
import { DashboardCard } from "@/components/shared/page";
import { TONE_CLASSES, languageCode, languageTone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { DASHBOARD_COPY } from "../copy";
import type { DashboardSession } from "../queries";
import { groupByDay } from "../timeline";

/**
 * Finished classes nobody has closed yet, as an inbox rather than a schedule.
 *
 * Built to look nothing like today's timeline beside it: an amber mark and a
 * count in the header, rows grouped under their day the way Gmail and Linear
 * group an inbox, and each row one dense line — time, language, who — because
 * the job is to work down the list, not to read it. When the list is empty it
 * says so in one line instead of disappearing, so the page keeps its shape.
 */
export function AttentionInbox({
  sessions,
  totalCount,
  className,
}: {
  sessions: DashboardSession[];
  totalCount: number;
  className?: string;
}) {
  const amber = TONE_CLASSES.amber;

  if (totalCount === 0) {
    return (
      <section
        className={cn(
          "flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs",
          className
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
            TONE_CLASSES.teal.avatar
          )}
        >
          <CircleCheck className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{DASHBOARD_COPY.attentionTitle}</h2>
          <p className="text-xs text-muted-foreground">{DASHBOARD_COPY.attentionEmpty}</p>
        </div>
      </section>
    );
  }

  const remaining = totalCount - sessions.length;

  return (
    <DashboardCard
      title={DASHBOARD_COPY.attentionTitle}
      description={DASHBOARD_COPY.attentionDescription}
      icon={
        <span
          aria-hidden="true"
          className={cn("inline-flex size-6 items-center justify-center rounded-md", amber.avatar)}
        >
          <AlertCircle className="size-3.5" />
        </span>
      }
      action={
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
            amber.chip
          )}
        >
          {totalCount}
        </span>
      }
      className={cn("flex flex-col", className)}
      bodyClassName="flex min-h-0 flex-1 flex-col p-0"
    >
      <div className="min-h-0 flex-1 overflow-y-auto border-t">
        {groupByDay(sessions).map((group) => (
          <div key={group.dateLabel}>
            <p className="bg-muted/40 px-5 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {group.dateLabel}
            </p>
            <ul>
              {group.rows.map((session) => {
                const tone = TONE_CLASSES[languageTone({ name: session.languageName })];

                return (
                  <li key={session.id}>
                    <Link
                      href={session.weekHref}
                      className="group flex min-h-10 items-center gap-2.5 px-5 py-2 text-sm transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none motion-reduce:transition-none"
                    >
                      <span className="w-10 shrink-0 text-xs text-muted-foreground tabular-nums">
                        {session.startLabel}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1 py-px text-[10px] leading-none font-bold tracking-wide",
                          tone.surface,
                          tone.text
                        )}
                      >
                        {languageCode({ name: session.languageName })}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium group-hover:underline">
                        {session.title}
                      </span>
                      <span className="hidden max-w-24 shrink-0 truncate text-xs text-muted-foreground sm:inline">
                        {session.teacherName.split(" ")[0]}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {remaining > 0 && sessions[0] && (
        <Link
          href={sessions[0].weekHref}
          className="flex items-center justify-between gap-2 border-t px-5 py-3 text-xs font-medium text-primary hover:bg-muted/40"
        >
          {DASHBOARD_COPY.attentionMore(remaining)}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      )}
    </DashboardCard>
  );
}
