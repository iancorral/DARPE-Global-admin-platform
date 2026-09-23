import Link from "next/link";
import { CalendarCheck, CalendarClock, CalendarDays, GraduationCap, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_TIMEZONE, formatInZone, todayInZone } from "@/lib/datetime";
import { getDashboardNotes } from "@/features/notes/queries";
import { DashboardNotes } from "@/features/notes/components/dashboard-notes";
import { getDashboardData } from "@/features/dashboard/queries";
import { DASHBOARD_COPY, greetingForHour } from "@/features/dashboard/copy";
import { ActivityChart } from "@/features/dashboard/components/activity-chart";
import { AttentionInbox } from "@/features/dashboard/components/attention-inbox";
import { KpiCard } from "@/features/dashboard/components/kpi-card";
import { TodayTimeline } from "@/features/dashboard/components/today-timeline";
import { WelcomeBanner } from "@/features/dashboard/components/welcome-banner";
import { TemporaryPasswordNotice } from "@/features/auth/components/temporary-password-notice";
import { getFinanceSnapshot } from "@/features/finance/provider";
import { FinanceSection } from "@/features/finance/components/finance-section";
import { DashboardCard, PageContainer } from "@/components/shared/page";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const now = new Date();
  const [profile, data] = await Promise.all([getCurrentUser(), getDashboardData(now)]);
  const today = todayInZone(DEFAULT_TIMEZONE);
  const [finance, notes] = await Promise.all([
    getFinanceSnapshot(data.monthStartDate),
    // Only ever the signed-in person's own notes.
    profile ? getDashboardNotes(profile.id, today) : Promise.resolve([]),
  ]);

  // Greeting time is academy wall-clock, never the server's. Rendered entirely
  // on the server, so there is nothing for the client to recompute and disagree
  // with. The name comes from the staff-managed Profile record; a blank name
  // degrades to the plain greeting rather than guessing from an email.
  const hour = Number(formatInZone(now, DEFAULT_TIMEZONE, "HH"));
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
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
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
        A 2×2 of equal cards, the same idea as the figures above it:

          Today (timeline)        │ Needs attention (+ your notes)
          Class activity (chart)  │ Money

        Every row is two halves of one height, so the page lines up on both
        edges whatever the data. The top row has a fixed height on a laptop and
        up: a busy day or a long inbox scrolls inside its own card instead of
        stretching the one beside it into a tall empty box — the two earlier
        layouts each failed one of those ways. On a phone it is one column,
        today first and the chart last.

        `grid-cols-1` on a phone, never an implicit track: an implicit column is
        sized to its widest content, and one long row is then enough to make the
        page wider than the screen. `min-w-0` lets each card shrink so
        truncation, not overflow, handles a long name.
      */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TodayTimeline
          sessions={data.today}
          todayLabel={data.todayLabel}
          calendarHref={data.calendarHref}
          nowMs={now.getTime()}
          className="min-w-0 lg:h-108"
        />

        <div className="flex min-w-0 flex-col gap-5 lg:h-108">
          {notes.length > 0 && (
            <DashboardNotes notes={notes} today={today} className="shrink-0 lg:max-h-[55%]" />
          )}
          <AttentionInbox
            sessions={data.needCompletion}
            totalCount={data.needCompletionCount}
            className="min-h-0 flex-1"
          />
        </div>

        <DashboardCard
          title={DASHBOARD_COPY.activityTitle}
          description={DASHBOARD_COPY.activityDescription(data.monthLabel)}
          className="min-w-0 max-lg:order-last"
        >
          <ActivityChart weeks={data.activityWeeks} summary={data.activitySummary} />
        </DashboardCard>

        <FinanceSection snapshot={finance} className="min-w-0" />
      </div>
    </PageContainer>
  );
}
