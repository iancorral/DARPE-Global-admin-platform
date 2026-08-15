import { getStudentFormOptions } from "@/features/students/queries";
import { StudentForm } from "@/features/students/components/student-form";
import { parseCalendarReturn } from "@/features/sessions/calendar-return";

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { languages, teachers } = await getStudentFormOptions();
  // Only a complete, well-formed calendar context is honoured; anything else
  // leaves this as the ordinary "new student" page.
  const calendarReturn = parseCalendarReturn(await searchParams);

  return (
    <div className="p-4 lg:p-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New student</h1>
      <StudentForm
        languages={languages}
        teachers={teachers}
        calendarReturn={calendarReturn}
      />
    </div>
  );
}
