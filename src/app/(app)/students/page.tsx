import Link from "next/link";
import { Plus } from "lucide-react";
import { getStudentRows } from "@/features/students/queries";
import { StudentsTable } from "@/features/students/components/students-table";
import { Button } from "@/components/ui/button";

export default async function StudentsPage() {
  const students = await getStudentRows();
  const activeCount = students.filter((student) => student.status === "ACTIVE").length;

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active · {students.length} total
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/students/new" />}>
          <Plus className="size-4" /> New student
        </Button>
      </div>

      <StudentsTable students={students} />
    </div>
  );
}
