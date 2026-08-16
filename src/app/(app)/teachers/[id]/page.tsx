import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Mail, Pencil, Phone } from "lucide-react";
import { getTeacherProfile } from "@/features/teachers/queries";
import { STUDENT_STATUS_LABELS } from "@/features/students/schemas";
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
    <div className="p-4 lg:p-8">
      <Link
        href="/teachers"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All teachers
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl font-semibold tracking-tight">{teacher.name}</h1>
            <Badge variant={teacher.active ? "default" : "outline"}>
              {teacher.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {teacher.languageNames.length > 0
              ? teacher.languageNames.join(" · ")
              : "No languages assigned"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/teachers/${teacher.id}/edit`} />}
          >
            <Pencil className="size-4" /> Edit
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/calendar?teacher=${teacher.id}`} />}
          >
            <CalendarDays className="size-4" /> Open calendar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                {teacher.email ?? <span className="text-muted-foreground">No email</span>}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                {teacher.phone ?? <span className="text-muted-foreground">No phone</span>}
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
            <CardContent className="space-y-2 text-sm">
              <WeekRow label="Scheduled" value={teacher.weekCounts.SCHEDULED} />
              <WeekRow label="Completed" value={teacher.weekCounts.COMPLETED} />
              <WeekRow label="Cancelled" value={teacher.weekCounts.CANCELLED} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Upcoming classes</CardTitle>
              {teacher.upcomingCount > teacher.upcoming.length && (
                <p className="text-xs text-muted-foreground">
                  Next {teacher.upcoming.length} of {teacher.upcomingCount} — the rest are on
                  the calendar.
                </p>
              )}
            </CardHeader>
            <CardContent>
              {teacher.upcoming.length === 0 ? (
                <EmptyNote>
                  No upcoming classes for this teacher. Classes are scheduled from the calendar.
                </EmptyNote>
              ) : (
                <ul className="divide-y">
                  {teacher.upcoming.map((session) => (
                    <li key={session.id}>
                      <Link
                        href={session.weekHref}
                        className="group flex items-center gap-3 py-2.5 text-sm"
                      >
                        <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Assigned students</CardTitle>
              <p className="text-xs text-muted-foreground">
                Students with this teacher as their primary teacher. Archived students are not
                listed.
              </p>
            </CardHeader>
            <CardContent>
              {teacher.students.length === 0 ? (
                <EmptyNote>No students are assigned to this teacher.</EmptyNote>
              ) : (
                <ul className="divide-y">
                  {teacher.students.map((student) => (
                    <li key={student.id}>
                      <Link
                        href={`/students/${student.id}`}
                        className="group flex items-center gap-3 py-2.5 text-sm"
                      >
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function WeekRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
