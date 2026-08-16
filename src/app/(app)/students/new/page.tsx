import { getStudentFormOptions } from "@/features/students/queries";
import { StudentForm } from "@/features/students/components/student-form";
import { parseCalendarReturn } from "@/features/sessions/calendar-return";
import {
  FormLayout,
  FormNote,
  PageContainer,
  PageHeader,
} from "@/components/shared/page";

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
    <PageContainer>
      <PageHeader title="New student" />
      <FormLayout
        aside={
          <>
            <FormNote title="What happens next">
              <p>
                Creating a student records them — it does not schedule anything. Classes
                are added from the calendar, where you can see the week and the teacher&apos;s
                other classes before choosing a time.
              </p>
              {calendarReturn && (
                <p>
                  You came here from the calendar, so you will be taken back to that time
                  with this student ready to schedule.
                </p>
              )}
            </FormNote>
            <FormNote title="Status">
              <p>
                <strong className="font-medium text-foreground">Active</strong> and{" "}
                <strong className="font-medium text-foreground">Trial</strong> students can
                be given new classes.
              </p>
              <p>
                <strong className="font-medium text-foreground">Paused</strong> and{" "}
                <strong className="font-medium text-foreground">Archived</strong> keep every
                class they already have, but no new ones can be scheduled and monthly
                generation skips them.
              </p>
            </FormNote>
            <FormNote title="Primary teacher">
              <p>
                A default, not a restriction. Any teacher who teaches the student&apos;s
                language can take a class — covering for a colleague is normal.
              </p>
            </FormNote>
          </>
        }
      >
        <StudentForm
          languages={languages}
          teachers={teachers}
          calendarReturn={calendarReturn}
        />
      </FormLayout>
    </PageContainer>
  );
}
