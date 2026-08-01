import Link from "next/link";
import { Plus } from "lucide-react";
import { getTeachers } from "@/features/teachers/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function TeachersPage() {
  const teachers = await getTeachers();

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teachers</h1>
          <p className="text-sm text-muted-foreground">{teachers.length} active</p>
        </div>
        <Button nativeButton={false} render={<Link href="/teachers/new" />}>
          <Plus className="size-4" /> New teacher
        </Button>
      </div>

      {teachers.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No teachers yet. Create the first one to get started.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Languages</TableHead>
                <TableHead className="hidden md:table-cell">Students</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">
                    {teacher.firstName} {teacher.lastName}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {teacher.languages.map(({ language }) => (
                        <Badge key={language.id} variant="secondary">
                          {language.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {teacher._count.primaryStudents}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {teacher.email ?? "—"}
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