import { getLanguageOptions } from "@/features/teachers/queries";
import { getTeacherDirectory } from "@/features/directory/queries";
import { TeacherForm } from "@/features/teachers/components/teacher-form";
import { PageContainer, PageHeader } from "@/components/shared/page";

export default async function NewTeacherPage() {
  const [languages, existing] = await Promise.all([
    getLanguageOptions(),
    getTeacherDirectory(),
  ]);

  return (
    <PageContainer>
      <PageHeader title="New teacher" />
      <TeacherForm languages={languages} existing={existing} />
    </PageContainer>
  );
}
