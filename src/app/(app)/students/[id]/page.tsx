import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, Pencil } from "lucide-react";
import { getStudentById, getStudentSessions } from "@/features/students/queries";
import { StudentClasses } from "@/features/students/components/student-classes";
import { STUDENT_STATUS_LABELS } from "@/features/students/schemas";
import { getScheduleFormOptions } from "@/features/schedules/queries";
import { isEligibleStudent } from "@/features/sessions/eligibility";
import { scheduleForStudentUrl } from "@/features/sessions/calendar-return";
import { LanguageChip } from "@/components/shared/identity";
import { PageContainer, PageHeader } from "@/components/shared/page";
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
    <PageContainer>
      <Link
        href="/students"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All students
      </Link>

      {/*
        Identity first, and one obvious next action: scheduling is the task
        staff come here for, so it is the primary button and editing is not.
      */}
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {student.firstName} {student.lastName}
            <Badge>{STUDENT_STATUS_LABELS[student.status]}</Badge>
          </span>
        }
        description={
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <LanguageChip name={student.language.name} />
            {student.level && <span>{student.level}</span>}
            <span>
              {student.primaryTeacher
                ? `${student.primaryTeacher.firstName} ${student.primaryTeacher.lastName}`
                : "No primary teacher"}
            </span>
          </span>
        }
        actions={
          <>
            {/*
              `nativeButton={false}` because these navigate: they render anchors,
              and Base UI must not treat them as native <button>s.
            */}
            {isEligibleStudent(student.status) && (
              <Button
                nativeButton={false}
                render={<Link href={scheduleForStudentUrl(currentWeekStart, student.id)} />}
              >
                <CalendarPlus className="size-4" /> Schedule class
              </Button>
            )}
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/students/${student.id}/edit`} />}
            >
              <Pencil className="size-4" /> Edit
            </Button>
          </>
        }
      />

      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Modality" value={student.modality.replaceAll("_", " ").toLowerCase()} />
              <Row label="Level" value={student.level ?? "—"} />
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
        </div>

        <div className="space-y-6 lg:col-span-2">
          <ScheduleManager
            studentId={student.id}
            slots={student.scheduleSlots}
            teachers={teachers}
          />
          <StudentClasses sessions={sessions} />
        </div>
      </div>
    </PageContainer>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right wrap-break-word">{value}</span>
    </div>
  );
}
