import { getLanguageOptions } from "@/features/teachers/queries";
import { TeacherForm } from "@/features/teachers/components/teacher-form";

export default async function NewTeacherPage() {
  const languages = await getLanguageOptions();

  return (
    <div className="p-4 lg:p-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New teacher</h1>
      <TeacherForm languages={languages} />
    </div>
  );
}