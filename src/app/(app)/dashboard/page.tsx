import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_TIMEZONE, formatInZone } from "@/lib/datetime";
import { getDashboardData, type DashboardSession } from "@/features/dashboard/queries";
import { DASHBOARD_COPY, greetingForHour } from "@/features/dashboard/copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Greeting time is academy wall-clock, never the server's. Rendered entirely
  // on the server, so there is nothing for the client to recompute and disagree
  // with. The name comes from the staff-managed Profile record; a blank name
  // degrades to the plain greeting rather than guessing from an email.
  const hour = Number(formatInZone(new Date(), DEFAULT_TIMEZONE, "HH"));
  const greeting = greetingForHour(hour);
  const firstName = profile?.name.trim().split(/\s+/)[0] ?? "";

  const weekTotal =
    data.weekCounts.SCHEDULED + data.weekCounts.COMPLETED + data.weekCounts.CANCELLED;

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {DASHBOARD_COPY.contextLine(data.todayLabel)}
          </p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href={data.calendarHref} />}>
          <CalendarDays className="size-4" /> {DASHBOARD_COPY.openCalendar}
        </Button>
      </div>

      {/*
        Actionable first, counts last: on a phone the day's classes and anything
        needing attention appear before any summary number.
      */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{DASHBOARD_COPY.todayTitle}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {data.today.length === 0
                ? data.todayLabel
                : `${data.todayLabel} · ${data.today.length} ${
                    data.today.length === 1 ? "class" : "classes"
                  }`}
            </p>
          </CardHeader>
          <CardContent>
            {data.today.length === 0 ? (
              <EmptyNote>{DASHBOARD_COPY.todayEmpty}</EmptyNote>
            ) : (
              <SessionList sessions={data.today} showDate={false} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{DASHBOARD_COPY.attentionTitle}</CardTitle>
              {data.needCompletion.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {DASHBOARD_COPY.attentionDescription}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {data.needCompletion.length === 0 ? (
                <EmptyNote>{DASHBOARD_COPY.attentionEmpty}</EmptyNote>
              ) : (
                <>
                  <SessionList sessions={data.needCompletion} showDate />
                  {data.needCompletionCount > data.needCompletion.length && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {DASHBOARD_COPY.attentionMore(
                        data.needCompletionCount - data.needCompletion.length
                      )}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{DASHBOARD_COPY.upcomingTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.upcoming.length === 0 ? (
                <EmptyNote>{DASHBOARD_COPY.upcomingEmpty}</EmptyNote>
              ) : (
                <SessionList sessions={data.upcoming} showDate />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">{DASHBOARD_COPY.overviewTitle}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label={DASHBOARD_COPY.overviewThisWeek}
            value={weekTotal}
            detail={DASHBOARD_COPY.overviewWeekDetail(
              data.weekCounts.COMPLETED,
              data.weekCounts.CANCELLED
            )}
          />
          <StatCard
            label={DASHBOARD_COPY.overviewActiveStudents}
            value={data.studentCounts.ACTIVE}
            detail={
              data.studentCounts.TRIAL > 0
                ? DASHBOARD_COPY.overviewTrialDetail(data.studentCounts.TRIAL)
                : undefined
            }
          />
          <StatCard
            label={DASHBOARD_COPY.overviewActiveTeachers}
            value={data.activeTeacherCount}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}

function SessionList({
  sessions,
  showDate,
}: {
  sessions: DashboardSession[];
  showDate: boolean;
}) {
  return (
    <ul className="divide-y">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            href={session.weekHref}
            className="group flex items-center gap-3 py-2.5 text-sm"
          >
            <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
              {showDate ? session.dateLabel : session.startLabel}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium group-hover:underline">
                {session.studentName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {showDate ? `${session.startLabel} · ` : ""}
                {session.languageName} · {session.teacherName}
              </span>
            </span>
            <Badge variant={CLASS_STATUS_VARIANT[session.status]}>
              {CLASS_STATUS_LABELS[session.status]}
            </Badge>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
