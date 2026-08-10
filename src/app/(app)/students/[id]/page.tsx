import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStudentById } from "@/features/students/queries";
import { getScheduleFormOptions } from "@/features/schedules/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleManager } from "@/features/schedules/components/schedule-manager";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await getStudentById(id);

  if (!student) notFound();

  const { teachers } = await getScheduleFormOptions();

  return (
    <div className="p-4 lg:p-8">
      <Link
        href="/students"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All students
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {student.firstName} {student.lastName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {student.language.name}
          {student.level ? ` · ${student.level}` : ""} ·{" "}
          {student.primaryTeacher
            ? `${student.primaryTeacher.firstName} ${student.primaryTeacher.lastName}`
            : "Unassigned"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Status" value={<Badge>{student.status}</Badge>} />
            <Row label="Modality" value={student.modality.replaceAll("_", " ").toLowerCase()} />
            <Row label="Email" value={student.email ?? "—"} />
            <Row label="Phone" value={student.phone ?? "—"} />
            {student.goal && (
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Goal</p>
                <p className="mt-1">{student.goal}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <ScheduleManager
            studentId={student.id}
            slots={student.scheduleSlots}
            teachers={teachers}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}