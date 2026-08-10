import Link from "next/link";
import { Plus } from "lucide-react";
import { getStudents } from "@/features/students/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  TRIAL: "secondary",
  PAUSED: "outline",
  ARCHIVED: "outline",
};

export default async function StudentsPage() {
  const students = await getStudents();

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">{students.length} active</p>
        </div>
        <Button nativeButton={false} render={<Link href="/students/new" />}>
          <Plus className="size-4" /> New student
        </Button>
      </div>

      {students.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No students yet. Create the first one to get started.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Language</TableHead>
                <TableHead className="hidden md:table-cell">Teacher</TableHead>
                <TableHead className="hidden lg:table-cell">Level</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    <Link href={`/students/${student.id}`} className="hover:underline">
                    {student.firstName} {student.lastName}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{student.language.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {student.primaryTeacher
                      ? `${student.primaryTeacher.firstName} ${student.primaryTeacher.lastName}`
                      : "Unassigned"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{student.level ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[student.status]}>{student.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}