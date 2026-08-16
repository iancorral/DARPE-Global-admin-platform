import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStudentById, getStudentFormOptions } from "@/features/students/queries";
import { StudentForm } from "@/features/students/components/student-form";

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
    <div className="p-4 lg:p-8">
      <Link
        href={`/students/${student.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {student.firstName} {student.lastName}
      </Link>

      <h1 className="mb-6 font-serif text-2xl font-semibold tracking-tight">Edit student</h1>
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
    </div>
  );
}
