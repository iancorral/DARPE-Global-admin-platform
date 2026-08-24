import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getGroupDetail, getGroupFormOptions } from "@/features/groups/queries";
import { GroupForm } from "@/features/groups/components/group-form";
import {
  FormLayout,
  FormNote,
  PageContainer,
  PageHeader,
} from "@/components/shared/page";

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [group, { teachers, languages }] = await Promise.all([
    getGroupDetail(id),
    getGroupFormOptions(),
  ]);

  if (!group) notFound();

  return (
    <PageContainer>
      <Link
        href={`/groups/${group.id}`}
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {group.name}
      </Link>

      <PageHeader title="Edit group" />
      <FormLayout
        aside={
          <>
            <FormNote title="Closing a group">
              <p>
                Every class it already produced is kept, attendance and all. It simply
                stops producing new ones, and its weekly schedule is no longer generated.
              </p>
            </FormNote>
            <FormNote title="Changing the teacher">
              <p>
                Classes already on the calendar keep the teacher assigned when they were
                created. The change applies to classes generated from now on.
              </p>
            </FormNote>
          </>
        }
      >
        <GroupForm
          teachers={teachers}
          languages={languages}
          hasMembers={group.members.length > 0}
          group={{
            id: group.id,
            active: group.active,
            name: group.name,
            teacherId: group.teacherId,
            languageId: group.languageId,
            notes: group.notes ?? "",
          }}
        />
      </FormLayout>
    </PageContainer>
  );
}
