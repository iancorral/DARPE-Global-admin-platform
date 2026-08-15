"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { formatInZone, parseDateOnly, weekdayOfDate } from "@/lib/datetime";
import { createWeeklySeries } from "@/features/schedules/actions";
import {
  DEFAULT_SERIES_WEEKS,
  defaultSeriesEndsOn,
  weeklyOccurrenceDates,
} from "@/features/schedules/series";
import { WEEKDAYS } from "@/features/schedules/schemas";
import { createSession } from "../actions";
import {
  CREATE_MODES,
  DEFAULT_CREATE_MODE,
  newStudentUrl,
  type CreateMode,
} from "../calendar-return";
import { defaultTeacherFor, initialStudent, teachersForStudent } from "../class-form";
import {
  creationInputFor,
  endTimeLabel,
  formatSlotTime,
  type CreationSlot,
} from "../scheduling";
import { DURATION_OPTIONS } from "../schemas";
import type { CreateClassStudent, CreateClassTeacher } from "../queries";

const DEFAULT_DURATION = "60";

const MODE_LABELS: Record<CreateMode, string> = {
  "one-time": "One-time",
  weekly: "Repeat weekly",
};

/** How many of a series' dates the helper text names before summarising. */
const MAX_LISTED_DATES = 4;

type Props = {
  /** The calendar position being created at, or null when the dialog is closed. */
  slot: CreationSlot | null;
  /** Whether that position has already passed, so the wording can say so. */
  isPast: boolean;
  students: CreateClassStudent[];
  teachers: CreateClassTeacher[];
  /** The week on screen, so leaving to add a student can come back to it. */
  weekStart: string;
  teacherFilterId?: string;
  initialMode?: CreateMode;
  /** A student to start from, after adding one or arriving from their profile. */
  initialStudentId?: string | null;
  /**
   * The duration and repeat-until date the dialog already had, restored after a
   * trip out to the student form. Null falls back to the usual defaults.
   */
  initialDurationMinutes?: number | null;
  initialEndsOn?: string | null;
  onOpenChange: (open: boolean) => void;
};

/**
 * The rest of a new class, once the calendar has answered when.
 *
 * The date and time are not editable here on purpose: they were chosen on the
 * calendar, where the surrounding week is visible, and repeating them as a date
 * picker inside the modal only invites the two to disagree. Changing the time
 * means closing this and picking another position.
 *
 * One class and a weekly series are the same dialog because they are the same
 * decision — who, with whom, how long — asked once. The only thing the mode
 * changes is how many weeks it applies to.
 */
export function CreateClassDialog({
  slot,
  isPast,
  students,
  teachers,
  weekStart,
  teacherFilterId,
  initialMode,
  initialStudentId,
  initialDurationMinutes,
  initialEndsOn,
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
            weekStart={weekStart}
            teacherFilterId={teacherFilterId}
            initialMode={initialMode}
            initialStudentId={initialStudentId}
            initialDurationMinutes={initialDurationMinutes}
            initialEndsOn={initialEndsOn}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function weekdayLabel(date: string): string {
  return WEEKDAYS.find((day) => day.value === weekdayOfDate(date))?.label ?? "";
}

/** "Aug 17, Aug 24, Aug 31, Sep 7", or the first few and a count. */
function describeDates(dates: string[]): string {
  const listed = dates.slice(0, MAX_LISTED_DATES);
  const remaining = dates.length - listed.length;
  // Formatted in UTC because these are calendar dates, not instants: the day
  // itself is the value, and it must not shift when it is named.
  const readable = listed.map((date) => formatInZone(parseDateOnly(date), "UTC", "MMM d"));

  return remaining > 0 ? `${readable.join(", ")} and ${remaining} more` : readable.join(", ");
}

function CreateClassForm({
  slot,
  isPast,
  students,
  teachers,
  weekStart,
  teacherFilterId,
  initialMode,
  initialStudentId,
  initialDurationMinutes,
  initialEndsOn,
  onDone,
}: {
  slot: CreationSlot;
  isPast: boolean;
  students: CreateClassStudent[];
  teachers: CreateClassTeacher[];
  weekStart: string;
  teacherFilterId?: string;
  initialMode?: CreateMode;
  initialStudentId?: string | null;
  initialDurationMinutes?: number | null;
  initialEndsOn?: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<CreateMode>(initialMode ?? DEFAULT_CREATE_MODE);
  const [studentId, setStudentId] = useState(
    () => initialStudent(students, initialStudentId)?.id ?? ""
  );
  // The teacher is worked out from the student rather than restored: a student who
  // has just been created may study another language entirely.
  const [teacherId, setTeacherId] = useState(() =>
    defaultTeacherFor(teachers, initialStudent(students, initialStudentId))
  );
  const [durationMinutes, setDurationMinutes] = useState(
    () => (initialDurationMinutes ? String(initialDurationMinutes) : DEFAULT_DURATION)
  );
  const [endsOn, setEndsOn] = useState(
    () => initialEndsOn ?? defaultSeriesEndsOn(slot.date)
  );
  const [isPending, setIsPending] = useState(false);

  const student = students.find((candidate) => candidate.id === studentId);
  const eligibleTeachers = teachersForStudent(teachers, student);
  const startTime = formatSlotTime(slot.startMinutes);
  const endLabel = endTimeLabel(slot.startMinutes, Number(durationMinutes));
  // The same expansion the server will do, so the dialog can only ever promise
  // what actually gets created.
  const seriesDates = weeklyOccurrenceDates(slot.date, endsOn);
  const isSeriesValid = mode !== "weekly" || seriesDates.length > 0;
  const canSubmit = Boolean(studentId && teacherId) && isSeriesValid && !isPending;

  function handleStudentChange(value: string) {
    setStudentId(value);
    // The chosen teacher may not teach the new student's language, so the
    // selection follows the student rather than silently becoming invalid.
    setTeacherId(defaultTeacherFor(teachers, students.find((s) => s.id === value)));
  }

  /**
   * Leaves for the student form carrying only where the calendar was and what has
   * already been answered about the class itself: the week, this position, the
   * mode, the duration, and the repeat-until date when it applies. No personal
   * detail travels in the URL, and the destination is this application's own
   * student page — there is no address here for a caller to redirect.
   *
   * The selected teacher is deliberately left behind, because the student coming
   * back may not study the language that teacher teaches.
   */
  function handleCreateStudent() {
    router.push(
      newStudentUrl({
        from: "calendar",
        week: weekStart,
        date: slot.date,
        time: startTime,
        mode,
        teacher: teacherFilterId,
        duration: Number(durationMinutes),
        ...(mode === "weekly" && { until: endsOn }),
      })
    );
  }

  async function handleCreate() {
    setIsPending(true);
    const result =
      mode === "weekly"
        ? await createWeeklySeries({
            studentId,
            teacherId,
            startsOn: slot.date,
            endsOn,
            startTime,
            durationMinutes: Number(durationMinutes),
          })
        : await createSession({
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

    toast.success(
      mode === "weekly"
        ? `${seriesDates.length} weekly classes created`
        : "Class created"
    );
    router.refresh();
    onDone();
  }

  if (students.length === 0) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Create class</DialogTitle>
          <DialogDescription>
            {slot.dayLabel} · {startTime}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-md border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No active or trial students yet. Add a student and you will come straight back
            to this time.
          </p>
          <Button variant="outline" onClick={handleCreateStudent}>
            <UserPlus className="size-4" /> Create new student
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create class</DialogTitle>
        <DialogDescription>
          {mode === "weekly"
            ? "A weekly class, repeating until the end date you choose."
            : "A one-off individual class. It does not change any recurring schedule."}
        </DialogDescription>
      </DialogHeader>

      <dl className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {mode === "weekly" ? "First class" : "When"}
          </dt>
          <dd className="text-right font-medium tabular-nums">
            {slot.dayLabel} · {startTime} – {endLabel}
          </dd>
        </div>
      </dl>

      {isPast && (
        <p className="rounded-md border border-dashed border-amber-300 px-3 py-2 text-xs text-amber-700">
          This date has already passed. The class will be added as scheduled — mark it
          completed once you have recorded who attended.
        </p>
      )}

      <fieldset className="space-y-2" disabled={isPending}>
        <legend className="mb-2 text-sm font-medium">Repeats</legend>
        <div className="grid grid-cols-2 gap-2">
          {CREATE_MODES.map((option) => (
            <label
              key={option}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-3 text-sm transition-colors",
                "hover:bg-muted",
                "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-violet-600",
                "has-[input:checked]:border-violet-500 has-[input:checked]:bg-violet-50 has-[input:checked]:font-medium has-[input:checked]:text-violet-900",
                "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50"
              )}
            >
              <input
                type="radio"
                name="create-class-mode"
                value={option}
                checked={mode === option}
                onChange={() => setMode(option)}
                className="sr-only"
              />
              {MODE_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="create-class-student">Student</Label>
          <Select
            items={students.map((s) => ({ label: s.name, value: s.id }))}
            value={studentId}
            disabled={isPending}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            {student && (
              <p className="text-xs text-muted-foreground">
                Language: {student.languageName}, taken from the student.
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateStudent}
              disabled={isPending}
            >
              <UserPlus className="size-4" /> Create new student
            </Button>
          </div>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="create-class-teacher">Teacher</Label>
          <Select
            items={eligibleTeachers.map((t) => ({ label: t.name, value: t.id }))}
            value={teacherId}
            disabled={isPending || eligibleTeachers.length === 0}
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
            disabled={isPending}
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

        {mode === "weekly" && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="create-class-ends-on">Repeat until</Label>
            <Input
              id="create-class-ends-on"
              type="date"
              value={endsOn}
              min={slot.date}
              disabled={isPending}
              onChange={(event) => setEndsOn(event.target.value)}
            />
            {seriesDates.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Repeats every {weekdayLabel(slot.date)} at {startTime} until {endsOn} —{" "}
                {seriesDates.length} {seriesDates.length === 1 ? "class" : "classes"} on{" "}
                {describeDates(seriesDates)}. The default covers {DEFAULT_SERIES_WEEKS}{" "}
                weeks.
              </p>
            ) : (
              <p className="text-xs text-destructive">
                The end date must be on or after {slot.date}.
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {mode === "weekly"
          ? "Times are in the academy timezone. Every week has to be free, or nothing is created."
          : "Times are in the academy timezone. The teacher must be free at that time."}
      </p>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onDone} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={!canSubmit}>
          {isPending
            ? "Creating..."
            : mode === "weekly"
              ? `Create ${seriesDates.length} ${seriesDates.length === 1 ? "class" : "classes"}`
              : "Create class"}
        </Button>
      </DialogFooter>
    </>
  );
}
