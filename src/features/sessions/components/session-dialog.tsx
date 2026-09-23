"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CalendarDays,
  CalendarX,
  Check,
  Clock,
  GraduationCap,
  Move,
  Pencil,
  Repeat,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/shared/date-field";
import { InitialsAvatar, LanguageChip } from "@/components/shared/identity";
import { TONE_CLASSES, languageTone } from "@/lib/tone";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { endSeriesFromSession, updateSeriesFromSession } from "@/features/schedules/actions";
import {
  SERIES_LENGTH_OPTIONS,
  defaultSeriesEndsOn,
  endsOnForOccurrences,
  occurrencesBetween,
  weeklyOccurrenceDates,
} from "@/features/schedules/series";
import { completeSession, setSessionStatus, updateSessionScheduling } from "../actions";
import { canEditScheduling, canRecordAttendance } from "../lifecycle";
import { calendarUrl } from "../scheduling";
import { groupSizeLabel, sessionTitle } from "../session-title";
import { REQUEST_FAILED_MESSAGE } from "../request-feedback";
import { StartTimeSelect } from "./start-time-select";
import { ATTENDANCE_OPTIONS, DURATION_OPTIONS, type AttendanceValue } from "../schemas";
import type { CalendarSession, CreateClassTeacher } from "../queries";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  SCHEDULED: "secondary",
  COMPLETED: "default",
  CANCELLED: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const DEFAULT_ATTENDANCE: AttendanceValue = "PRESENT";

/** "Monday, Sep 21" from a calendar date, read as that date and nothing else. */
function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** 60 → "1 h", 90 → "1 h 30 min", 45 → "45 min". */
function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** One fact about the class, behind the icon that names it. */
function DetailRow({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 wrap-break-word">{children}</div>
    </li>
  );
}

/** How much of a recurring series an edit applies to. */
const EDIT_SCOPES = ["single", "series"] as const;

type EditScope = (typeof EDIT_SCOPES)[number];

const SCOPE_LABELS: Record<EditScope, string> = {
  single: "Only this class",
  series: "This and future classes",
};

type Props = {
  session: CalendarSession | null;
  teachers: CreateClassTeacher[];
  weekStart: string;
  teacherFilterId?: string;
  /** Sends focus back to the card that opened this. */
  finalFocus: () => HTMLElement | true;
  onOpenChange: (open: boolean) => void;
};

export function SessionDialog({
  session,
  teachers,
  weekStart,
  teacherFilterId,
  finalFocus,
  onOpenChange,
}: Props) {
  // Work that must not start until this dialog has finished closing — entering move
  // mode is a navigation, and beginning one while a modal still owns focus, the
  // scroll lock and pointer blocking can leave the page behind it inert.
  const afterClose = useRef<(() => void) | null>(null);

  function requestClose(then?: () => void) {
    afterClose.current = then ?? null;
    onOpenChange(false);
  }

  return (
    <Dialog
      open={session !== null}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(open) => {
        if (open) return;
        const run = afterClose.current;
        afterClose.current = null;
        run?.();
      }}
    >
      {/* Wider than the other dialogs: a recurring class carries up to five actions. */}
      <DialogContent className="sm:max-w-lg" finalFocus={finalFocus}>
        {session && (
          <SessionDetail
            key={session.id}
            session={session}
            teachers={teachers}
            weekStart={weekStart}
            teacherFilterId={teacherFilterId}
            onDone={requestClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Durations offered for this class: the usual menu, plus whatever length it already
 * has. A session generated from an older recurring slot can be a length no longer
 * on the menu, and editing it must not silently change how long the class is.
 */
function durationChoices(current: number): number[] {
  return [...new Set<number>([...DURATION_OPTIONS, current])].sort((a, b) => a - b);
}

function SessionDetail({
  session,
  teachers,
  weekStart,
  teacherFilterId,
  onDone,
}: {
  session: CalendarSession;
  teachers: CreateClassTeacher[];
  weekStart: string;
  teacherFilterId?: string;
  onDone: (then?: () => void) => void;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [scope, setScope] = useState<EditScope>("single");
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [endsOn, setEndsOn] = useState(() => defaultSeriesEndsOn(session.date));
  const [teacherId, setTeacherId] = useState(session.teacherId);
  const [date, setDate] = useState(session.date);
  const [startTime, setStartTime] = useState(session.startLabel);
  const [durationMinutes, setDurationMinutes] = useState(String(session.durationMinutes));
  const [attendance, setAttendance] = useState<Record<string, AttendanceValue>>(() =>
    Object.fromEntries(
      session.participants.map((participant) => [
        participant.id,
        participant.attendance ?? DEFAULT_ATTENDANCE,
      ])
    )
  );
  const [isPending, setIsPending] = useState(false);

  const { status } = session;
  const canEdit = canEditScheduling(status);
  const showAttendance = canRecordAttendance(status) && session.participants.length > 0;
  // Series actions belong to a class that is both part of a rule and still a plan.
  const canEditSeries = canEdit && session.belongsToSeries;
  const isSeriesScope = canEditSeries && scope === "series";
  // The same expansion the server will do, so the dialog only promises what will
  // actually be written.
  const seriesDates = isSeriesScope ? weeklyOccurrenceDates(date, endsOn) : [];

  // Only teachers of this class's language may take it over. The current teacher is
  // kept in the list even if their languages changed, so opening the form never
  // silently reassigns the class.
  const eligibleTeachers = teachers.filter(
    (teacher) =>
      teacher.languageIds.includes(session.languageId) || teacher.id === session.teacherId
  );

  // A group class is titled by its group; its members are listed below, where
  // attendance is taken.
  const title = sessionTitle(session);
  const groupSize = groupSizeLabel(session);
  const tone = TONE_CLASSES[languageTone({ name: session.languageName })];

  /**
   * Move mode lives in the URL, so starting one is a navigation. It waits for this
   * dialog to finish closing: the calendar underneath is what move mode is about to
   * become interactive, and it cannot be while a modal still holds focus and blocks
   * pointer events behind it.
   *
   * Pushed, deliberately — entering move mode is something the user chose, so Back
   * should step out of it. Leaving move mode replaces instead, so the pair never
   * leaves an abandoned `?moving=` entry behind to be walked back into.
   */
  function handleMove() {
    onDone(() =>
      router.push(
        calendarUrl({ week: weekStart, teacher: teacherFilterId, moving: session.id })
      )
    );
  }

  async function handleSaveScheduling() {
    setIsPending(true);
    try {
      const result = await updateSessionScheduling({
        id: session.id,
        teacherId,
        date,
        startTime,
        durationMinutes: Number(durationMinutes),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Session updated");
      router.refresh();
      onDone();
    } catch {
      toast.error(REQUEST_FAILED_MESSAGE);
    } finally {
      setIsPending(false);
    }
  }

  /**
   * Replaces this class and every later one in its series. The cutoff is not sent:
   * the server takes it from this class's stored occurrence, so a moved class still
   * changes the series from the week it belongs to.
   */
  async function handleSaveSeries() {
    setIsPending(true);
    try {
      const result = await updateSeriesFromSession({
        id: session.id,
        teacherId,
        startsOn: date,
        endsOn,
        startTime,
        durationMinutes: Number(durationMinutes),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Series updated · ${result.updated} changed` +
          (result.created > 0 ? `, ${result.created} added` : "") +
          (result.cancelled > 0 ? `, ${result.cancelled} cancelled` : "")
      );
      router.refresh();
      onDone();
    } catch {
      toast.error(REQUEST_FAILED_MESSAGE);
    } finally {
      setIsPending(false);
    }
  }

  async function handleEndSeries() {
    setIsPending(true);
    try {
      const result = await endSeriesFromSession({ id: session.id });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.cancelled === 1
          ? "Series ended · 1 upcoming class cancelled"
          : `Series ended · ${result.cancelled} upcoming classes cancelled`
      );
      router.refresh();
      onDone();
    } catch {
      toast.error(REQUEST_FAILED_MESSAGE);
    } finally {
      setIsPending(false);
    }
  }

  async function handleStatus(next: "SCHEDULED" | "CANCELLED", successMessage: string) {
    setIsPending(true);
    try {
      const result = await setSessionStatus({ id: session.id, status: next });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(successMessage);
      router.refresh();
      onDone();
    } catch {
      toast.error(REQUEST_FAILED_MESSAGE);
    } finally {
      setIsPending(false);
    }
  }

  async function handleComplete(successMessage: string) {
    setIsPending(true);
    try {
      const result = await completeSession({
        id: session.id,
        attendance: session.participants.map((participant) => ({
          participantId: participant.id,
          value: attendance[participant.id] ?? DEFAULT_ATTENDANCE,
        })),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(successMessage);
      router.refresh();
      onDone();
    } catch {
      toast.error(REQUEST_FAILED_MESSAGE);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      {/*
        Laid out like a calendar event card (Google Calendar, Outlook): the
        class's own colour on the left of the title, then one line per fact,
        each behind an icon, so the eye runs straight down a single column.
      */}
      <DialogHeader className="gap-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={cn("mt-1 size-3.5 shrink-0 rounded", tone.dot)}
          />
          <div className="min-w-0 space-y-1.5">
            <DialogTitle className="font-serif text-xl leading-tight font-semibold">
              {title}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <LanguageChip name={session.languageName} className="h-5 py-0" />
              <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <DialogBody>
      {confirmingEnd ? (
        <div className="space-y-3 rounded-md border border-dashed border-destructive/40 p-4">
          <p className="text-sm font-medium">End this series from this class?</p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            <li>This class and every later scheduled class in the series are cancelled.</li>
            <li>Earlier classes are left exactly as they are.</li>
            <li>Completed classes are never changed, and nothing is deleted.</li>
          </ul>
        </div>
      ) : isEditing ? (
        <div className="grid gap-4 @md:grid-cols-2">
          {canEditSeries && (
            <fieldset className="space-y-2 @md:col-span-2" disabled={isPending}>
              <legend className="mb-2 text-sm font-medium">Apply to</legend>
              <div className="grid grid-cols-2 gap-2">
                {EDIT_SCOPES.map((option) => (
                  <label
                    key={option}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-3 text-center text-sm transition-colors",
                      "hover:bg-muted",
                      "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-violet-600",
                      "has-[input:checked]:border-violet-500 has-[input:checked]:bg-violet-50 has-[input:checked]:font-medium has-[input:checked]:text-violet-900",
                      "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="session-edit-scope"
                      className="sr-only"
                      value={option}
                      checked={scope === option}
                      onChange={() => setScope(option)}
                    />
                    {SCOPE_LABELS[option]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="space-y-2 @md:col-span-2">
            <Label htmlFor="session-teacher">Teacher</Label>
            <Select
              items={eligibleTeachers.map((t) => ({ label: t.name, value: t.id }))}
              value={teacherId}
              onValueChange={(value) => value !== null && setTeacherId(value)}
            >
              <SelectTrigger id="session-teacher" className="w-full">
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
            <p className="text-xs text-muted-foreground">
              {isSeriesScope
                ? "Applies to this class and every later one in the series, including future classes that were moved on their own. Earlier classes are never touched, and the student's primary teacher stays as it is."
                : "Changes this class only. The recurring schedule and the student's primary teacher stay as they are."}
            </p>
          </div>

          {/*
            No date field when editing one class. Moving a class to another day
            is what move mode is for — it shows the week and the teacher's other
            classes while you choose — so a second way to do it here would be a
            worse version of the same thing. What is actually edited from this
            dialog is the teacher, the time and the length.
          */}
          {isSeriesScope && (
            <div className="space-y-2">
              <Label htmlFor="session-date">New first date</Label>
              <DateField
                id="session-date"
                value={date}
                min={session.date}
                onChange={setDate}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="session-time">Start time</Label>
            <StartTimeSelect
              id="session-time"
              value={startTime}
              current={session.startLabel}
              onValueChange={setStartTime}
            />
          </div>

          <div className="space-y-2 @md:col-span-2">
            <Label htmlFor="session-duration">Duration</Label>
            <Select
              items={durationChoices(session.durationMinutes).map((d) => ({
                label: `${d} min`,
                value: String(d),
              }))}
              value={durationMinutes}
              onValueChange={(value) => value !== null && setDurationMinutes(value)}
            >
              <SelectTrigger id="session-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durationChoices(session.durationMinutes).map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isSeriesScope && (
            <div className="space-y-2 @md:col-span-2">
              <Label htmlFor="session-repeat-until">Number of classes</Label>
              <Select
                items={SERIES_LENGTH_OPTIONS.map((count) => ({
                  label: `${count} classes`,
                  value: String(count),
                }))}
                value={String(occurrencesBetween(date, endsOn) || 4)}
                onValueChange={(value) =>
                  value !== null && setEndsOn(endsOnForOccurrences(date, Number(value)))
                }
              >
                <SelectTrigger id="session-repeat-until" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERIES_LENGTH_OPTIONS.map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count} classes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {seriesDates.length > 0
                  ? `${seriesDates.length} weekly ${seriesDates.length === 1 ? "class" : "classes"} from ${date}. A replacement series always has an end date, so choose one even if the current schedule had none.`
                  : "Choose an end date on or after the first class."}
              </p>
            </div>
          )}
        </div>
      ) : (
        <ul className="space-y-3 text-sm">
          <DetailRow icon={Clock}>
            <span className="font-medium">{dayLabel(session.date)}</span>
            <span className="block text-muted-foreground tabular-nums">
              {session.startLabel} – {session.endLabel} · {durationLabel(session.durationMinutes)}
            </span>
          </DetailRow>
          <DetailRow icon={GraduationCap}>{session.teacherName}</DetailRow>
          <DetailRow icon={session.belongsToSeries ? Repeat : CalendarDays}>
            {session.belongsToSeries ? "Every week" : "One-off class"}
            {groupSize && <span className="text-muted-foreground"> · {groupSize}</span>}
          </DetailRow>
        </ul>
      )}

      {showAttendance && !isEditing && !confirmingEnd && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Attendance
          </p>
          {session.participants.map((participant) => (
            <div key={participant.id} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 flex-1 items-center gap-2.5">
                <InitialsAvatar name={participant.studentName} className="size-7 text-[11px]" />
                <span className="truncate text-sm font-medium">{participant.studentName}</span>
              </span>
              <Select
                items={ATTENDANCE_OPTIONS.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                value={attendance[participant.id] ?? DEFAULT_ATTENDANCE}
                onValueChange={(value) =>
                  value !== null &&
                  setAttendance((current) => ({
                    ...current,
                    [participant.id]: value as AttendanceValue,
                  }))
                }
              >
                <SelectTrigger
                  className="w-36"
                  aria-label={`Attendance for ${participant.studentName}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      {!confirmingEnd && (status !== "SCHEDULED" || isEditing) && (
        <p className="text-xs text-muted-foreground">
          {status === "COMPLETED"
            ? "Reopen the class to change its time."
            : status === "CANCELLED"
              ? "Restore the class to change its time."
              : isSeriesScope
                ? "A clash in any week refuses the whole change."
                : "Only this class changes."}
        </p>
      )}
      </DialogBody>

      {/*
        Destructive actions on the left, routine ones on the right, each group free
        to wrap onto its own line. A recurring class offers five actions and they
        must stay inside the card at every width.
      */}
      <DialogFooter className="sm:justify-between">
        {confirmingEnd && (
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmingEnd(false)}
              disabled={isPending}
            >
              Keep the series
            </Button>
            <Button
              variant="destructive"
              onClick={handleEndSeries}
              disabled={isPending}
            >
              {isPending ? "Ending..." : "End series"}
            </Button>
          </div>
        )}

        {!confirmingEnd && status === "CANCELLED" && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleStatus("SCHEDULED", "Session restored")}
            disabled={isPending}
          >
            <RotateCcw className="size-4" /> Restore class
          </Button>
        )}

        {!confirmingEnd && status === "COMPLETED" && (
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => handleStatus("SCHEDULED", "Class reopened")}
              disabled={isPending}
            >
              <RotateCcw className="size-4" /> Reopen class
            </Button>
            <Button onClick={() => handleComplete("Attendance saved")} disabled={isPending}>
              {isPending ? "Saving..." : "Save attendance"}
            </Button>
          </div>
        )}

        {/*
          Two even rows rather than a ragged wrap: what you do to a class that
          is happening on top, full width and equal, with the most common one —
          marking it done — as the primary; the two ways to call it off below,
          quieter and split evenly.
        */}
        {!confirmingEnd && canEdit && !isEditing && (
          <div className="grid w-full gap-2">
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => setIsEditing(true)} disabled={isPending}>
                <Pencil className="size-4" /> Edit
              </Button>
              <Button variant="outline" onClick={handleMove} disabled={isPending}>
                <Move className="size-4" /> Move
              </Button>
              <Button
                onClick={() => handleComplete("Class marked completed")}
                disabled={isPending}
              >
                <Check className="size-4" /> Complete
              </Button>
            </div>
            <div className={cn("grid gap-2", canEditSeries ? "grid-cols-2" : "grid-cols-1")}>
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleStatus("CANCELLED", "Session cancelled")}
                disabled={isPending}
              >
                <Ban className="size-4" /> Cancel class
              </Button>
              {canEditSeries && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmingEnd(true)}
                  disabled={isPending}
                >
                  <CalendarX className="size-4" /> End series
                </Button>
              )}
            </div>
          </div>
        )}

        {!confirmingEnd && canEdit && isEditing && (
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
            >
              Back
            </Button>
            {isSeriesScope ? (
              <Button
                onClick={handleSaveSeries}
                disabled={isPending || seriesDates.length === 0}
              >
                {isPending ? "Saving..." : "Save future classes"}
              </Button>
            ) : (
              <Button onClick={handleSaveScheduling} disabled={isPending}>
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            )}
          </div>
        )}
      </DialogFooter>
    </>
  );
}
