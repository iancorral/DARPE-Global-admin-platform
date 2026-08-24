import { getGroupFormOptions } from "@/features/groups/queries";
import { GroupForm } from "@/features/groups/components/group-form";
import {
  FormLayout,
  FormNote,
  PageContainer,
  PageHeader,
} from "@/components/shared/page";

export default async function NewGroupPage() {
  const { teachers, languages } = await getGroupFormOptions();

  return (
    <PageContainer>
      <PageHeader title="New group" />
      <FormLayout
        aside={
          <>
            <FormNote title="What happens next">
              <p>
                Creating a group records the cohort. Then you add students to it and give
                it a weekly schedule — the classes themselves appear once the month is
                generated from the calendar.
              </p>
            </FormNote>
            <FormNote title="One teacher, one language">
              <p>
                Every class the group produces is taught by this teacher in this language,
                and only students who study it can join.
              </p>
              <p>
                The teacher list shows only those who teach the language you pick, and the
                same rule is checked again when the group is saved.
              </p>
            </FormNote>
            <FormNote title="Attendance">
              <p>
                A group class carries every member as a participant, so attendance is
                recorded per student exactly as it is for an individual class.
              </p>
            </FormNote>
          </>
        }
      >
        <GroupForm teachers={teachers} languages={languages} />
      </FormLayout>
    </PageContainer>
  );
}
