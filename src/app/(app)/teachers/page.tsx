import Link from "next/link";
import { Plus } from "lucide-react";
import { getTeacherRows } from "@/features/teachers/queries";
import { TeachersTable } from "@/features/teachers/components/teachers-table";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";

export default async function TeachersPage() {
  const teachers = await getTeacherRows();
  const activeCount = teachers.filter((teacher) => teacher.active).length;

  return (
    <PageContainer>
      <PageHeader
        title="Teachers"
        description={`${activeCount} active · ${teachers.length} total`}
        actions={
          <Button nativeButton={false} render={<Link href="/teachers/new" />}>
            <Plus className="size-4" /> New teacher
          </Button>
        }
      />
      <TeachersTable teachers={teachers} />
    </PageContainer>
  );
}
