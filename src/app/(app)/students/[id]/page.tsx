import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import {
  getStudentById,
  getStudentFormOptions,
  getStudentSessions,
} from "@/features/students/queries";
import { StudentClasses } from "@/features/students/components/student-classes";
import { StudentIdentityCard } from "@/features/students/components/student-identity";
import { getScheduleFormOptions } from "@/features/schedules/queries";
import { isEligibleStudent } from "@/features/sessions/eligibility";
import { scheduleForStudentUrl } from "@/features/sessions/calendar-return";
import { PageContainer } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { ScheduleManager } from "@/features/schedules/components/schedule-manager";
import { DEFAULT_TIMEZONE, startOfWeekDate, todayInZone } from "@/lib/datetime";
import { fullName } from "@/lib/names";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await getStudentById(id);

  if (!student) notFound();

  const [{ teachers }, options, sessions] = await Promise.all([
    getScheduleFormOptions(),
    getStudentFormOptions(),
    getStudentSessions(student.id),
  ]);
  const currentWeekStart = startOfWeekDate(todayInZone(DEFAULT_TIMEZONE));

  return (
    <PageContainer>
      <Link
        href="/students"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All students
      </Link>

      {/*
        Everything about the student is edited on this card. There is no edit
        page: a separate form meant four navigations to change one value, and a
        submit that rewrote every column to change one of them.
      */}
      <StudentIdentityCard
        student={{
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          phone: student.phone,
          level: student.level,
          goal: student.goal,
          modality: student.modality,
          status: student.status,
          billing: student.billing,
          payMethod: student.payMethod,
          languageId: student.languageId,
          languageName: student.language.name,
          primaryTeacherId: student.primaryTeacherId,
          primaryTeacherName: student.primaryTeacher
            ? fullName(student.primaryTeacher)
            : null,
        }}
        languages={options.languages}
        teachers={options.teachers.map((teacher) => ({
          id: teacher.id,
          name: fullName(teacher),
          languageIds: teacher.languageIds,
        }))}
        actions={
          isEligibleStudent(student.status) ? (
            // `nativeButton={false}` because this navigates: it renders an
            // anchor, and Base UI must not treat it as a native <button>.
            <Button
              nativeButton={false}
              render={<Link href={scheduleForStudentUrl(currentWeekStart, student.id)} />}
            >
              <CalendarPlus className="size-4" /> Add a class
            </Button>
          ) : undefined
        }
      />

      <div className="mt-6 space-y-6">
        <ScheduleManager
          studentId={student.id}
          slots={student.scheduleSlots}
          teachers={teachers}
        />
        <StudentClasses sessions={sessions} />
      </div>
    </PageContainer>
  );
}
