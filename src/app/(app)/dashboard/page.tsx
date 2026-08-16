import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  GraduationCap,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_TIMEZONE, formatInZone } from "@/lib/datetime";
import { INTERACTIVE_ROW } from "@/lib/interaction";
import { TONE_CLASSES, languageTone } from "@/lib/tone";
import { getDashboardData, type DashboardSession } from "@/features/dashboard/queries";
import { DASHBOARD_COPY, greetingForHour } from "@/features/dashboard/copy";
import { ActivityChart } from "@/features/dashboard/components/activity-chart";
import { KpiCard } from "@/features/dashboard/components/kpi-card";
import { getFinanceSnapshot } from "@/features/finance/provider";
import { FinanceSection } from "@/features/finance/components/finance-section";
import { InitialsAvatar } from "@/components/shared/identity";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer, PageHeader, Section } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClassStatus } from "@/generated/prisma/client";

const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const CLASS_STATUS_VARIANT: Record<ClassStatus, "default" | "secondary" | "outline"> = {
  SCHEDULED: "secondary",
  COMPLETED: "default",
  CANCELLED: "outline",
};

export default async function DashboardPage() {
  const [profile, data] = await Promise.all([getCurrentUser(), getDashboardData()]);
  // Null unless the demo flag is on: there is no real finance data yet, and the
  // section says so rather than showing zeros.
  const finance = getFinanceSnapshot(data.monthStartDate);

  // Greeting time is academy wall-clock, never the server's. Rendered entirely
  // on the server, so there is nothing for the client to recompute and disagree
  // with. The name comes from the staff-managed Profile record; a blank name
  // degrades to the plain greeting rather than guessing from an email.
  const hour = Number(formatInZone(new Date(), DEFAULT_TIMEZONE, "HH"));
  const greeting = greetingForHour(hour);
  const firstName = profile?.name.trim().split(/\s+/)[0] ?? "";

  return (
    <PageContainer>
      <PageHeader
        title={firstName ? `${greeting}, ${firstName}` : greeting}
        description={DASHBOARD_COPY.contextLine(
          data.todayLabel,
          data.monthLabel,
          data.monthCompletedCount,
          data.monthScheduledCount
        )}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={data.calendarHref} />}
          >
            <CalendarDays className="size-4" /> {DASHBOARD_COPY.openCalendar}
          </Button>
        }
      />

      {/* The month at a glance, each figure from a real count. */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={DASHBOARD_COPY.kpiTaughtThisMonth}
          value={data.monthCompletedCount}
          detail={DASHBOARD_COPY.kpiMonthDetail(data.monthLabel)}
          tone="teal"
          icon={CalendarCheck}
        />
        <KpiCard
          label={DASHBOARD_COPY.kpiStillScheduled}
          value={data.monthScheduledCount}
          detail={DASHBOARD_COPY.kpiMonthDetail(data.monthLabel)}
          tone="violet"
          icon={CalendarClock}
        />
        <KpiCard
          label={DASHBOARD_COPY.overviewActiveStudents}
          value={data.studentCounts.ACTIVE}
          detail={
            data.studentCounts.TRIAL > 0
              ? DASHBOARD_COPY.overviewTrialDetail(data.studentCounts.TRIAL)
              : "no trial students"
          }
          tone="blue"
          icon={Users}
        />
        <KpiCard
          label={DASHBOARD_COPY.overviewActiveTeachers}
          value={data.activeTeacherCount}
          tone="amber"
          icon={GraduationCap}
        />
      </div>

      {/*
        Three things, in the order a coordinator actually needs them: how the
        month is going, what is happening today, and anything left unresolved.
        Everything else — the rest of the week, the full lists — belongs on the
        calendar and the list pages, and repeating it here only made the page
        harder to read.
      */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section
            title={DASHBOARD_COPY.activityTitle}
            description={DASHBOARD_COPY.activityDescription(data.monthLabel)}
          >
            <div className="rounded-xl border bg-card p-5 shadow-xs">
              <ActivityChart weeks={data.activityWeeks} summary={data.activitySummary} />
            </div>
          </Section>
        </div>

        <div className="lg:col-span-1">
          <Section
            title={DASHBOARD_COPY.todayTitle}
            description={
              data.today.length === 0
                ? data.todayLabel
                : `${data.todayLabel} · ${DASHBOARD_COPY.todayCount(data.today.length)}`
            }
          >
            {data.today.length === 0 ? (
              <EmptyState tone="compact">{DASHBOARD_COPY.todayEmpty}</EmptyState>
            ) : (
              <SessionList sessions={data.today} showDate={false} />
            )}
          </Section>

        </div>
      </div>

      {/*
        Only shown when something is actually unresolved. An empty "nothing to
        do" panel every day is noise on the one section that should mean work.
      */}
      {data.needCompletion.length > 0 && (
        <div className="mt-6">
          <Section
            title={DASHBOARD_COPY.attentionTitle}
            description={DASHBOARD_COPY.attentionDescription}
          >
            <SessionList sessions={data.needCompletion} showDate />
            {data.needCompletionCount > data.needCompletion.length && (
              <p className="mt-3 text-xs text-muted-foreground">
                {DASHBOARD_COPY.attentionMore(
                  data.needCompletionCount - data.needCompletion.length
                )}
              </p>
            )}
          </Section>
        </div>
      )}

      <div className="mt-6">
        <FinanceSection snapshot={finance} />
      </div>
    </PageContainer>
  );
}

function SessionList({
  sessions,
  showDate,
  compact = false,
}: {
  sessions: DashboardSession[];
  showDate: boolean;
  compact?: boolean;
}) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {sessions.map((session) => {
        const tone = TONE_CLASSES[languageTone({ name: session.languageName })];

        return (
          <li key={session.id}>
            <Link
              href={session.weekHref}
              className={cn(
                "group flex min-h-11 items-center gap-3 px-4 py-3 text-sm",
                INTERACTIVE_ROW
              )}
            >
              {/* Language as a colour rail, with the name still in the line below. */}
              <span aria-hidden="true" className={cn("h-8 w-1 shrink-0 rounded-full", tone.dot)} />
              {!compact && (
                <span className="w-20 shrink-0 tabular-nums text-muted-foreground">
                  {showDate ? session.dateLabel : session.startLabel}
                </span>
              )}
              <InitialsAvatar name={session.studentName} className="hidden sm:inline-flex" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium group-hover:underline">
                  {session.studentName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {compact && showDate ? `${session.dateLabel} · ` : ""}
                  {showDate || compact ? `${session.startLabel} · ` : ""}
                  {session.languageName} · {session.teacherName}
                </span>
              </span>
              <Badge variant={CLASS_STATUS_VARIANT[session.status]}>
                {CLASS_STATUS_LABELS[session.status]}
              </Badge>
              <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
