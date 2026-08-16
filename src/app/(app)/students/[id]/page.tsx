import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, Pencil } from "lucide-react";
import { getStudentById, getStudentSessions } from "@/features/students/queries";
import { StudentClasses } from "@/features/students/components/student-classes";
import { STUDENT_STATUS_LABELS } from "@/features/students/schemas";
import { getScheduleFormOptions } from "@/features/schedules/queries";
import { isEligibleStudent } from "@/features/sessions/eligibility";
import { scheduleForStudentUrl } from "@/features/sessions/calendar-return";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleManager } from "@/features/schedules/components/schedule-manager";
import { DEFAULT_TIMEZONE, startOfWeekDate, todayInZone } from "@/lib/datetime";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await getStudentById(id);

  if (!student) notFound();

  const [{ teachers }, sessions] = await Promise.all([
    getScheduleFormOptions(),
    getStudentSessions(student.id),
  ]);
  const currentWeekStart = startOfWeekDate(todayInZone(DEFAULT_TIMEZONE));

  return (
    <div className="p-4 lg:p-8">
      <Link
        href="/students"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All students
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">
            {student.firstName} {student.lastName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {student.language.name}
            {student.level ? ` · ${student.level}` : ""} ·{" "}
            {student.primaryTeacher
              ? `${student.primaryTeacher.firstName} ${student.primaryTeacher.lastName}`
              : "Unassigned"}
          </p>
        </div>

        {/*
          Opens the calendar with this student ready to be scheduled. It stops
          there on purpose: a class needs a time, and the calendar is where a time
          is chosen with the week in view.
        */}
        {/*
          `nativeButton={false}` because this navigates: it renders an anchor, and
          Base UI must not treat it as a native <button>. The same pattern as the
          "New student" and "New teacher" links.
        */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/students/${student.id}/edit`} />}
          >
            <Pencil className="size-4" /> Edit
          </Button>
          {isEligibleStudent(student.status) && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={scheduleForStudentUrl(currentWeekStart, student.id)} />}
            >
              <CalendarPlus className="size-4" /> Schedule class
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Status" value={<Badge>{STUDENT_STATUS_LABELS[student.status]}</Badge>} />
            <Row label="Modality" value={student.modality.replaceAll("_", " ").toLowerCase()} />
            <Row label="Email" value={student.email ?? "—"} />
            <Row label="Phone" value={student.phone ?? "—"} />
            {student.goal && (
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Goal</p>
                <p className="mt-1">{student.goal}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <ScheduleManager
            studentId={student.id}
            slots={student.scheduleSlots}
            teachers={teachers}
          />
        </div>
      </div>

      <div className="mt-6">
        <StudentClasses sessions={sessions} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}