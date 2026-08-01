import { getStudentFormOptions } from "@/features/students/queries";
import { StudentForm } from "@/features/students/components/student-form";

export default async function NewStudentPage() {
  const { languages, teachers } = await getStudentFormOptions();

  return (
    <div className="p-4 lg:p-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New student</h1>
      <StudentForm languages={languages} teachers={teachers} />
    </div>
  );
}