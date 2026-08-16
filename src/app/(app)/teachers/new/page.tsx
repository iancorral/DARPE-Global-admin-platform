import { getLanguageOptions } from "@/features/teachers/queries";
import { TeacherForm } from "@/features/teachers/components/teacher-form";
import {
  FormLayout,
  FormNote,
  PageContainer,
  PageHeader,
} from "@/components/shared/page";

export default async function NewTeacherPage() {
  const languages = await getLanguageOptions();

  return (
    <PageContainer>
      <PageHeader title="New teacher" />
      <FormLayout
        aside={
          <>
            <FormNote title="What happens next">
              <p>
                A teacher is a record, not an account. Teachers do not sign in — staff
                manage their schedule for them, and classes are assigned from the calendar.
              </p>
            </FormNote>
            <FormNote title="Languages taught">
              <p>
                This is enforced when scheduling: a teacher can only be given a class in a
                language listed here, checked again on the server when the class is saved.
              </p>
              <p>Add more later by editing the teacher — nothing is locked in.</p>
            </FormNote>
            <FormNote title="Contact details">
              <p>
                Optional and internal. They are only shown inside this admin, never to
                students, and never appear in a link or an address bar.
              </p>
            </FormNote>
          </>
        }
      >
        <TeacherForm languages={languages} />
      </FormLayout>
    </PageContainer>
  );
}
