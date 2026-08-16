import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLanguageOptions, getTeacherById } from "@/features/teachers/queries";
import { TeacherForm } from "@/features/teachers/components/teacher-form";
import {
  FormLayout,
  FormNote,
  PageContainer,
  PageHeader,
} from "@/components/shared/page";

export default async function EditTeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [teacher, languages] = await Promise.all([getTeacherById(id), getLanguageOptions()]);

  if (!teacher) notFound();

  return (
    <PageContainer>
      <Link
        href={`/teachers/${teacher.id}`}
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {teacher.firstName} {teacher.lastName}
      </Link>

      <PageHeader title="Edit teacher" />
      <FormLayout
        aside={
          <>
            <FormNote title="Making a teacher inactive">
              <p>
                Their existing classes are kept exactly as they are. They simply stop
                appearing when scheduling, and monthly generation no longer creates
                classes for their recurring slots.
              </p>
              <p>Reactivate them any time from the Teachers list.</p>
            </FormNote>
            <FormNote title="Removing a language">
              <p>
                Classes already taught in it are untouched. The restriction applies from
                now on, when a new class is scheduled.
              </p>
            </FormNote>
          </>
        }
      >
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
      </FormLayout>
    </PageContainer>
  );
}
