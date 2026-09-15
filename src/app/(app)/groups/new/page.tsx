import { getGroupFormOptions } from "@/features/groups/queries";
import { getGroupDirectory } from "@/features/directory/queries";
import { GroupForm } from "@/features/groups/components/group-form";
import { PageContainer, PageHeader } from "@/components/shared/page";

export default async function NewGroupPage() {
  const [{ teachers, languages }, existing] = await Promise.all([
    getGroupFormOptions(),
    getGroupDirectory(),
  ]);

  return (
    <PageContainer>
      <PageHeader title="New group" />
      <GroupForm teachers={teachers} languages={languages} existing={existing} />
    </PageContainer>
  );
}
