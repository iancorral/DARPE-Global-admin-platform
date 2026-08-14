"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createSession } from "../actions";
import {
  creationInputFor,
  endTimeLabel,
  formatSlotTime,
  type CreationSlot,
} from "../scheduling";
import { DURATION_OPTIONS } from "../schemas";
import type { CreateClassStudent, CreateClassTeacher } from "../queries";

const DEFAULT_DURATION = "60";

type Props = {
  /** The calendar position being created at, or null when the dialog is closed. */
  slot: CreationSlot | null;
  /** Whether that position has already passed, so the wording can say so. */
  isPast: boolean;
  students: CreateClassStudent[];
  teachers: CreateClassTeacher[];
  onOpenChange: (open: boolean) => void;
};

/**
 * The rest of a new class, once the calendar has answered when.
 *
 * The date and time are not editable here on purpose: they were chosen on the
 * calendar, where the surrounding week is visible, and repeating them as a date
 * picker inside the modal only invites the two to disagree. Changing the time
 * means closing this and picking another position.
 */
export function CreateClassDialog({
  slot,
  isPast,
  students,
  teachers,
  onOpenChange,
}: Props) {
  return (
    <Dialog open={slot !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {slot && (
          <CreateClassForm
            key={`${slot.date}-${slot.startMinutes}`}
            slot={slot}
            isPast={isPast}
            students={students}
            teachers={teachers}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
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
  slot,
  isPast,
  students,
  teachers,
  onDone,
}: {
  slot: CreationSlot;
  isPast: boolean;
  students: CreateClassStudent[];
  teachers: CreateClassTeacher[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(() =>
    defaultTeacherFor(teachers, students[0])
  );
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [isPending, setIsPending] = useState(false);

  const student = students.find((candidate) => candidate.id === studentId);
  const eligibleTeachers = teachersForStudent(teachers, student);
  const canSubmit = Boolean(studentId && teacherId) && !isPending;

  const endLabel = endTimeLabel(slot.startMinutes, Number(durationMinutes));

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
      ...creationInputFor(slot),
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

      <dl className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">When</dt>
          <dd className="text-right font-medium tabular-nums">
            {slot.dayLabel} · {formatSlotTime(slot.startMinutes)} – {endLabel}
          </dd>
        </div>
      </dl>

      {isPast && (
        <p className="rounded-md border border-dashed border-amber-300 px-3 py-2 text-xs text-amber-700">
          This date has already passed. The class will be added as scheduled — mark it
          completed once you have recorded who attended.
        </p>
      )}

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
