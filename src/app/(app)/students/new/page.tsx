import { getStudentFormOptions } from "@/features/students/queries";
import { getStudentDirectory } from "@/features/directory/queries";
import { StudentForm } from "@/features/students/components/student-form";
import { parseCalendarReturn } from "@/features/sessions/calendar-return";
import { PageContainer, PageHeader } from "@/components/shared/page";

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ languages, teachers }, existing, params] = await Promise.all([
    getStudentFormOptions(),
    getStudentDirectory(),
    searchParams,
  ]);
  // Only a complete, well-formed calendar context is honoured; anything else
  // leaves this as the ordinary "new student" page.
  const calendarReturn = parseCalendarReturn(params);

  return (
    <PageContainer>
      <PageHeader title="New student" />
      <StudentForm
        languages={languages}
        teachers={teachers}
        calendarReturn={calendarReturn}
        existing={existing}
      />
    </PageContainer>
  );
}
