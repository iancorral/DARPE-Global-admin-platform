import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLanguageOptions, getTeacherById } from "@/features/teachers/queries";
import { TeacherForm } from "@/features/teachers/components/teacher-form";

export default async function EditTeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [teacher, languages] = await Promise.all([getTeacherById(id), getLanguageOptions()]);

  if (!teacher) notFound();

  return (
    <div className="p-4 lg:p-8">
      <Link
        href={`/teachers/${teacher.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {teacher.firstName} {teacher.lastName}
      </Link>

      <h1 className="mb-6 font-serif text-2xl font-semibold tracking-tight">Edit teacher</h1>
      <TeacherForm
        languages={languages}
        teacher={{
          id: teacher.id,
          active: teacher.active,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          email: teacher.email ?? "",
          phone: teacher.phone ?? "",
          languageIds: teacher.languages.map((entry) => entry.languageId),
        }}
      />
    </div>
  );
}
