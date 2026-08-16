import Link from "next/link";
import { Plus } from "lucide-react";
import { getTeacherRows } from "@/features/teachers/queries";
import { TeachersTable } from "@/features/teachers/components/teachers-table";
import { Button } from "@/components/ui/button";

export default async function TeachersPage() {
  const teachers = await getTeacherRows();
  const activeCount = teachers.filter((teacher) => teacher.active).length;

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Teachers</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active · {teachers.length} total
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/teachers/new" />}>
          <Plus className="size-4" /> New teacher
        </Button>
      </div>

      <TeachersTable teachers={teachers} />
    </div>
  );
}
