import Link from "next/link";
import { Plus } from "lucide-react";
import { getStudentRows } from "@/features/students/queries";
import { StudentsTable } from "@/features/students/components/students-table";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";

export default async function StudentsPage() {
  const students = await getStudentRows();
  const activeCount = students.filter((student) => student.status === "ACTIVE").length;

  return (
    <PageContainer>
      <PageHeader
        title="Students"
        description={`${activeCount} active · ${students.length} total`}
        actions={
          <Button nativeButton={false} render={<Link href="/students/new" />}>
            <Plus className="size-4" /> New student
          </Button>
        }
      />
      <StudentsTable students={students} />
    </PageContainer>
  );
}
