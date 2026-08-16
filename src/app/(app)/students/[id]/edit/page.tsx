import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStudentById, getStudentFormOptions } from "@/features/students/queries";
import { StudentForm } from "@/features/students/components/student-form";
import {
  FormLayout,
  FormNote,
  PageContainer,
  PageHeader,
} from "@/components/shared/page";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [student, { languages, teachers }] = await Promise.all([
    getStudentById(id),
    getStudentFormOptions(),
  ]);

  if (!student) notFound();

  // The options list holds active teachers. If this student's primary teacher has
  // gone inactive they are appended, marked as such, so the current assignment is
  // still visible and saving the form does not silently drop it.
  const teacherOptions =
    student.primaryTeacher && !teachers.some((t) => t.id === student.primaryTeacher?.id)
      ? [...teachers, { ...student.primaryTeacher, inactive: true }]
      : teachers;

  return (
    <PageContainer>
      <Link
        href={`/students/${student.id}`}
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {student.firstName} {student.lastName}
      </Link>

      <PageHeader title="Edit student" />
      <FormLayout
        aside={
          <>
            <FormNote title="Changing status">
              <p>
                Moving a student to Paused or Archived keeps every class they already
                have. It only stops new ones being scheduled, and monthly generation
                skips them from then on.
              </p>
            </FormNote>
            <FormNote title="Changing language or teacher">
              <p>
                Neither touches classes that already exist. Their language and teacher were
                recorded when each class was created, so history stays as it happened.
              </p>
            </FormNote>
          </>
        }
      >
      <StudentForm
        languages={languages}
        teachers={teacherOptions}
        student={{
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email ?? "",
          phone: student.phone ?? "",
          languageId: student.languageId,
          primaryTeacherId: student.primaryTeacherId ?? "",
          modality: student.modality,
          status: student.status,
          level: student.level ?? "",
          goal: student.goal ?? "",
        }}
      />
      </FormLayout>
    </PageContainer>
  );
}
