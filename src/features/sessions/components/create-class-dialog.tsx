"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createSession } from "../actions";
import { DURATION_OPTIONS } from "../schemas";
import type { CreateClassStudent, CreateClassTeacher } from "../queries";

const DEFAULT_START_TIME = "09:00";
const DEFAULT_DURATION = "60";

type Props = {
  students: CreateClassStudent[];
  teachers: CreateClassTeacher[];
  defaultDate: string;
  disabled?: boolean;
};

export function CreateClassDialog({ students, teachers, defaultDate, disabled }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button disabled={disabled} onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Create class
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {open && (
            <CreateClassForm
              students={students}
              teachers={teachers}
              defaultDate={defaultDate}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Teachers who can take this class: the ones who teach the student's language.
 * The primary teacher is only a default here — covering for a colleague is normal,
 * so any qualified teacher may be chosen.
 */
function teachersForStudent(
  teachers: CreateClassTeacher[],
  student: CreateClassStudent | undefined
) {
  if (!student) return [];
  return teachers.filter((teacher) => teacher.languageIds.includes(student.languageId));
}

function defaultTeacherFor(
  teachers: CreateClassTeacher[],
  student: CreateClassStudent | undefined
) {
  const eligible = teachersForStudent(teachers, student);
  const primary = eligible.find((teacher) => teacher.id === student?.primaryTeacherId);
  return primary?.id ?? eligible[0]?.id ?? "";
}

function CreateClassForm({
  students,
  teachers,
  defaultDate,
  onDone,
}: Omit<Props, "disabled"> & { onDone: () => void }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(() =>
    defaultTeacherFor(teachers, students[0])
  );
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [isPending, setIsPending] = useState(false);

  const student = students.find((candidate) => candidate.id === studentId);
  const eligibleTeachers = teachersForStudent(teachers, student);
  const canSubmit = Boolean(studentId && teacherId) && !isPending;

  function handleStudentChange(value: string) {
    setStudentId(value);
    // The chosen teacher may not teach the new student's language, so the
    // selection follows the student rather than silently becoming invalid.
    setTeacherId(defaultTeacherFor(teachers, students.find((s) => s.id === value)));
  }

  async function handleCreate() {
    setIsPending(true);
    const result = await createSession({
      studentId,
      teacherId,
      date,
      startTime,
      durationMinutes: Number(durationMinutes),
    });
    setIsPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Class created");
    router.refresh();
    onDone();
  }

  if (students.length === 0) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Create class</DialogTitle>
          <DialogDescription>Schedule a one-off individual class.</DialogDescription>
        </DialogHeader>
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No active or trial students yet. Add a student before scheduling a class.
        </p>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create class</DialogTitle>
        <DialogDescription>
          A one-off individual class. It does not change any recurring schedule.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="create-class-student">Student</Label>
          <Select
            items={students.map((s) => ({ label: s.name, value: s.id }))}
            value={studentId}
            onValueChange={(value) => value !== null && handleStudentChange(value)}
          >
            <SelectTrigger id="create-class-student" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {student && (
            <p className="text-xs text-muted-foreground">
              Language: {student.languageName}, taken from the student.
            </p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="create-class-teacher">Teacher</Label>
          <Select
            items={eligibleTeachers.map((t) => ({ label: t.name, value: t.id }))}
            value={teacherId}
            disabled={eligibleTeachers.length === 0}
            onValueChange={(value) => value !== null && setTeacherId(value)}
          >
            <SelectTrigger id="create-class-teacher" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eligibleTeachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {student && eligibleTeachers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No active teacher teaches {student.languageName}.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-class-date">Date</Label>
          <Input
            id="create-class-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-class-time">Start time</Label>
          <Input
            id="create-class-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="create-class-duration">Duration</Label>
          <Select
            items={DURATION_OPTIONS.map((d) => ({ label: `${d} min`, value: String(d) }))}
            value={durationMinutes}
            onValueChange={(value) => value !== null && setDurationMinutes(value)}
          >
            <SelectTrigger id="create-class-duration" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Times are in the academy timezone. The teacher must be free at that time.
      </p>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onDone} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={!canSubmit}>
          {isPending ? "Creating..." : "Create class"}
        </Button>
      </DialogFooter>
    </>
  );
}
