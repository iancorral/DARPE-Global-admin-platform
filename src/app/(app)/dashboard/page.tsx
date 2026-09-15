import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChevronRight,
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
import { WelcomeBanner } from "@/features/dashboard/components/welcome-banner";
import { TemporaryPasswordNotice } from "@/features/auth/components/temporary-password-notice";
import { getFinanceSnapshot } from "@/features/finance/provider";
import { FinanceSection } from "@/features/finance/components/finance-section";
import { InitialsAvatar } from "@/components/shared/identity";
import { DashboardCard, PageContainer } from "@/components/shared/page";
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
  const finance = await getFinanceSnapshot(data.monthStartDate);

  // Greeting time is academy wall-clock, never the server's. Rendered entirely
  // on the server, so there is nothing for the client to recompute and disagree
  // with. The name comes from the staff-managed Profile record; a blank name
  // degrades to the plain greeting rather than guessing from an email.
  const hour = Number(formatInZone(new Date(), DEFAULT_TIMEZONE, "HH"));
  const greeting = greetingForHour(hour);
  const firstName = profile?.name.trim().split(/\s+/)[0] ?? "";

  return (
    <PageContainer>
      <WelcomeBanner
        title={firstName ? `${greeting}, ${firstName}` : greeting}
        description={DASHBOARD_COPY.contextLine(data.todayLabel, data.today.length)}
        actions={
          <Button
            nativeButton={false}
            render={<Link href={data.calendarHref} />}
          >
            <CalendarDays className="size-4" /> {DASHBOARD_COPY.openCalendar}
          </Button>
        }
      />

      {/* Only while they are still on the password somebody else chose. */}
      {profile && !profile.passwordSetAt && <TemporaryPasswordNotice />}

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
            data.studentCounts.PAUSED > 0
              ? DASHBOARD_COPY.overviewPausedDetail(data.studentCounts.PAUSED)
              : "none paused"
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
        Two stacked columns rather than a flowing grid. With a grid, a card that
        renders conditionally left the next one stranded beside empty space —
        the money panel sat alone in a third of the page. As two columns each
        holding their own stack, the page is symmetrical whatever renders: what
        you act on down the left, what you read down the right.
      */}
      {/*
        `grid-cols-1` on a phone, never an implicit track: an implicit column is
        sized to its widest content, and one long row in a list is then enough to
        make the whole page wider than the screen. `min-w-0` lets each column
        shrink below its content so truncation, not overflow, handles it.
      */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <DashboardCard
            title={DASHBOARD_COPY.activityTitle}
            description={DASHBOARD_COPY.activityDescription(data.monthLabel)}
          >
            <ActivityChart weeks={data.activityWeeks} summary={data.activitySummary} />
          </DashboardCard>

          {/*
            Only rendered when something is actually unresolved. An empty
            "nothing to do" panel every day is noise on the one section that is
            supposed to mean work.
          */}
          {data.needCompletion.length > 0 && (
            <DashboardCard
              title={DASHBOARD_COPY.attentionTitle}
              description={DASHBOARD_COPY.attentionDescription}
              icon={<Bell aria-hidden="true" className="size-4" />}
              bodyClassName="p-0"
            >
              <SessionList sessions={data.needCompletion} showDate />
              {data.needCompletionCount > data.needCompletion.length && (
                <p className="px-5 py-3 text-xs text-muted-foreground">
                  {DASHBOARD_COPY.attentionMore(
                    data.needCompletionCount - data.needCompletion.length
                  )}
                </p>
              )}
            </DashboardCard>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <DashboardCard
            title={DASHBOARD_COPY.todayTitle}
            description={
              data.today.length === 0
                ? data.todayLabel
                : `${data.todayLabel} · ${DASHBOARD_COPY.todayCount(data.today.length)}`
            }
            action={
              <Link
                href={data.calendarHref}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View calendar <ChevronRight aria-hidden="true" className="size-3.5" />
              </Link>
            }
            bodyClassName="p-0"
          >
            {data.today.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted-foreground">
                {DASHBOARD_COPY.todayEmpty}
              </p>
            ) : (
              <SessionList sessions={data.today} showDate={false} />
            )}
          </DashboardCard>

          <FinanceSection snapshot={finance} />
        </div>
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
    <ul className="divide-y border-t">
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
              <InitialsAvatar name={session.title} className="hidden sm:inline-flex" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium group-hover:underline">
                  {session.title}
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
