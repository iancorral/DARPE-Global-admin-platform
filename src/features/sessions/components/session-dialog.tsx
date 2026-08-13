"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Move, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { completeSession, setSessionStatus, updateSessionScheduling } from "../actions";
import { canEditScheduling, canRecordAttendance } from "../lifecycle";
import { calendarUrl } from "../scheduling";
import { ATTENDANCE_OPTIONS, DURATION_OPTIONS, type AttendanceValue } from "../schemas";
import type { CalendarSession, CreateClassTeacher } from "../queries";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  SCHEDULED: "secondary",
  COMPLETED: "default",
  CANCELLED: "outline",
};

const DEFAULT_ATTENDANCE: AttendanceValue = "PRESENT";

type Props = {
  session: CalendarSession | null;
  teachers: CreateClassTeacher[];
  weekStart: string;
  teacherFilterId?: string;
  onOpenChange: (open: boolean) => void;
};

export function SessionDialog({
  session,
  teachers,
  weekStart,
  teacherFilterId,
  onOpenChange,
}: Props) {
  return (
    <Dialog open={session !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {session && (
          <SessionDetail
            key={session.id}
            session={session}
            teachers={teachers}
            weekStart={weekStart}
            teacherFilterId={teacherFilterId}
            onDone={() => onOpenChange(false)}
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
  onDone: () => void;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
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

  // Only teachers of this class's language may take it over. The current teacher is
  // kept in the list even if their languages changed, so opening the form never
  // silently reassigns the class.
  const eligibleTeachers = teachers.filter(
    (teacher) =>
      teacher.languageIds.includes(session.languageId) || teacher.id === session.teacherId
  );

  const title =
    session.participants.length > 0
      ? session.participants.map((participant) => participant.studentName).join(", ")
      : "Class session";

  function handleMove() {
    router.push(
      calendarUrl({ week: weekStart, teacher: teacherFilterId, moving: session.id })
    );
    onDone();
  }

  async function handleSaveScheduling() {
    setIsPending(true);
    const result = await updateSessionScheduling({
      id: session.id,
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

    toast.success("Session updated");
    router.refresh();
    onDone();
  }

  async function handleStatus(next: "SCHEDULED" | "CANCELLED", successMessage: string) {
    setIsPending(true);
    const result = await setSessionStatus({ id: session.id, status: next });
    setIsPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(successMessage);
    router.refresh();
    onDone();
  }

  async function handleComplete(successMessage: string) {
    setIsPending(true);
    const result = await completeSession({
      id: session.id,
      attendance: session.participants.map((participant) => ({
        participantId: participant.id,
        value: attendance[participant.id] ?? DEFAULT_ATTENDANCE,
      })),
    });
    setIsPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(successMessage);
    router.refresh();
    onDone();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {session.languageName} · {session.teacherName}
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-2">
        <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
        {session.isGenerated && (
          <span className="text-xs text-muted-foreground">From a recurring schedule</span>
        )}
      </div>

      {isEditing ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
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
              Changes this class only. The recurring schedule and the student&apos;s primary
              teacher stay as they are.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-date">Date</Label>
            <Input
              id="session-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-time">Start time</Label>
            <Input
              id="session-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
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
        </div>
      ) : (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">When</dt>
            <dd className="text-right">
              {session.date} · {session.startLabel} – {session.endLabel}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Duration</dt>
            <dd className="text-right">{session.durationMinutes} min</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Teacher</dt>
            <dd className="text-right">{session.teacherName}</dd>
          </div>
        </dl>
      )}

      {showAttendance && !isEditing && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-semibold">Attendance</p>
          {session.participants.map((participant) => (
            <div key={participant.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm">{participant.studentName}</span>
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
                  className="w-32"
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

      <p className="text-xs text-muted-foreground">
        {status === "COMPLETED"
          ? "Completed classes keep the time they happened. Reopen the class to change it."
          : status === "CANCELLED"
            ? "Cancelled classes keep their original time. Restore the class to change it."
            : "Changes apply to this session only. The recurring schedule stays as it is."}
      </p>

      <DialogFooter className="gap-2">
        {status === "CANCELLED" && (
          <Button
            variant="outline"
            onClick={() => handleStatus("SCHEDULED", "Session restored")}
            disabled={isPending}
          >
            Restore session
          </Button>
        )}

        {status === "COMPLETED" && (
          <>
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
          </>
        )}

        {canEdit && !isEditing && (
          <>
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => handleStatus("CANCELLED", "Session cancelled")}
              disabled={isPending}
            >
              Cancel class
            </Button>
            <Button
              variant="outline"
              onClick={() => handleComplete("Class marked completed")}
              disabled={isPending}
            >
              <Check className="size-4" /> Mark completed
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(true)} disabled={isPending}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button onClick={handleMove} disabled={isPending}>
              <Move className="size-4" /> Move class
            </Button>
          </>
        )}

        {canEdit && isEditing && (
          <>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
            >
              Back
            </Button>
            <Button onClick={handleSaveScheduling} disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}
