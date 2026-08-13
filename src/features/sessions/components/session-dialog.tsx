"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw } from "lucide-react";
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
import { completeSession, rescheduleSession, setSessionStatus } from "../actions";
import { canEditScheduling, canRecordAttendance } from "../lifecycle";
import { ATTENDANCE_OPTIONS, DURATION_OPTIONS, type AttendanceValue } from "../schemas";
import type { CalendarSession } from "../queries";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  SCHEDULED: "secondary",
  COMPLETED: "default",
  CANCELLED: "outline",
};

const DEFAULT_ATTENDANCE: AttendanceValue = "PRESENT";

type Props = {
  session: CalendarSession | null;
  onOpenChange: (open: boolean) => void;
};

export function SessionDialog({ session, onOpenChange }: Props) {
  return (
    <Dialog open={session !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {session && (
          <SessionDetail
            key={session.id}
            session={session}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SessionDetail({ session, onDone }: { session: CalendarSession; onDone: () => void }) {
  const router = useRouter();
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
  const schedulingLocked = !canEditScheduling(status);
  const showAttendance = canRecordAttendance(status) && session.participants.length > 0;

  const title =
    session.participants.length > 0
      ? session.participants.map((participant) => participant.studentName).join(", ")
      : "Class session";

  async function handleReschedule() {
    setIsPending(true);
    const result = await rescheduleSession({
      id: session.id,
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input
            type="date"
            value={date}
            disabled={schedulingLocked}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Start time</Label>
          <Input
            type="time"
            value={startTime}
            disabled={schedulingLocked}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Duration</Label>
          <Select
            items={DURATION_OPTIONS.map((d) => ({ label: `${d} min`, value: String(d) }))}
            value={durationMinutes}
            disabled={schedulingLocked}
            onValueChange={(value) => value !== null && setDurationMinutes(value)}
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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

      {showAttendance && (
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

        {status === "SCHEDULED" && (
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
            <Button onClick={handleReschedule} disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}
