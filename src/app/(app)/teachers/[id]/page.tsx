import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Mail, Pencil, Phone } from "lucide-react";
import { getTeacherProfile } from "@/features/teachers/queries";
import { STUDENT_STATUS_LABELS } from "@/features/students/schemas";
import { EmptyState } from "@/components/shared/empty-state";
import { InitialsAvatar, LanguageChip } from "@/components/shared/identity";
import { PageContainer, PageHeader, Section } from "@/components/shared/page";
import { INTERACTIVE_ROW } from "@/lib/interaction";
import { TONE_CLASSES, languageTone } from "@/lib/tone";
import { cn } from "@/lib/utils";
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

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await getTeacherProfile(id);

  if (!teacher) notFound();

  return (
    <PageContainer>
      <Link
        href="/teachers"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All teachers
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {teacher.name}
            <Badge variant={teacher.active ? "default" : "outline"}>
              {teacher.active ? "Active" : "Inactive"}
            </Badge>
          </span>
        }
        description={
          teacher.languageNames.length > 0 ? (
            <span className="mt-1 flex flex-wrap gap-1.5">
              {teacher.languageNames.map((name) => (
                <LanguageChip key={name} name={name} />
              ))}
            </span>
          ) : (
            "No languages assigned"
          )
        }
        actions={
          <>
            <Button
              nativeButton={false}
              render={<Link href={`/calendar?teacher=${teacher.id}`} />}
            >
              <CalendarDays className="size-4" /> Open calendar
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/teachers/${teacher.id}/edit`} />}
            >
              <Pencil className="size-4" /> Edit
            </Button>
          </>
        }
      />

      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-start gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 wrap-break-word">
                  {teacher.email ?? <span className="text-muted-foreground">No email</span>}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 wrap-break-word">
                  {teacher.phone ?? <span className="text-muted-foreground">No phone</span>}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">This week</CardTitle>
              <p className="text-xs text-muted-foreground">
                Monday to Sunday, academy time. Cancelled classes occupy no time.
              </p>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <WeekRow label="Scheduled" value={teacher.weekCounts.SCHEDULED} />
                <WeekRow label="Completed" value={teacher.weekCounts.COMPLETED} />
                <WeekRow label="Cancelled" value={teacher.weekCounts.CANCELLED} />
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Section
            title="Upcoming classes"
            description={
              teacher.upcomingCount > teacher.upcoming.length
                ? `Next ${teacher.upcoming.length} of ${teacher.upcomingCount} — the rest are on the calendar.`
                : undefined
            }
          >
            {teacher.upcoming.length === 0 ? (
              <EmptyState tone="compact">
                No upcoming classes. Classes are scheduled from the calendar.
              </EmptyState>
            ) : (
              <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                {teacher.upcoming.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={session.weekHref}
                      className={cn(
                        "group flex min-h-11 items-center gap-3 px-4 py-3 text-sm",
                        INTERACTIVE_ROW
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-8 w-1 shrink-0 rounded-full",
                          TONE_CLASSES[languageTone({ name: session.languageName })].dot
                        )}
                      />
                      <span className="w-20 shrink-0 tabular-nums text-muted-foreground">
                        {session.dateLabel}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium group-hover:underline">
                          {session.studentName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {session.startLabel} · {session.durationMinutes} min ·{" "}
                          {session.languageName}
                        </span>
                      </span>
                      <Badge variant={CLASS_STATUS_VARIANT[session.status]}>
                        {CLASS_STATUS_LABELS[session.status]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Assigned students"
            description="Students with this teacher as their primary teacher. Archived students are not listed."
          >
            {teacher.students.length === 0 ? (
              <EmptyState tone="compact">No students are assigned to this teacher.</EmptyState>
            ) : (
              <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                {teacher.students.map((student) => (
                  <li key={student.id}>
                    <Link
                      href={`/students/${student.id}`}
                      className={cn(
                        "group flex min-h-11 items-center gap-3 px-4 py-3 text-sm",
                        INTERACTIVE_ROW
                      )}
                    >
                      <InitialsAvatar name={student.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium group-hover:underline">
                          {student.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {student.languageName}
                        </span>
                      </span>
                      <Badge variant={student.status === "ACTIVE" ? "default" : "secondary"}>
                        {STUDENT_STATUS_LABELS[student.status]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </PageContainer>
  );
}

function WeekRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
