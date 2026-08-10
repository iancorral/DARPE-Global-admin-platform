"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { rescheduleSession, setSessionStatus } from "../actions";
import { DURATION_OPTIONS } from "../schemas";
import type { CalendarSession } from "../queries";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  SCHEDULED: "secondary",
  COMPLETED: "default",
  CANCELLED: "outline",
};

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
  const [isPending, setIsPending] = useState(false);

  const isCancelled = session.status === "CANCELLED";
  const title =
    session.studentNames.length > 0 ? session.studentNames.join(", ") : "Class session";

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

  async function handleStatus(status: "SCHEDULED" | "CANCELLED") {
    setIsPending(true);
    const result = await setSessionStatus({ id: session.id, status });
    setIsPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(status === "CANCELLED" ? "Session cancelled" : "Session restored");
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
        <Badge variant={STATUS_VARIANT[session.status]}>{session.status}</Badge>
        {session.isGenerated && (
          <span className="text-xs text-muted-foreground">From a recurring schedule</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Start time</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Duration</Label>
          <Select
            items={DURATION_OPTIONS.map((d) => ({ label: `${d} min`, value: String(d) }))}
            value={durationMinutes}
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

      <p className="text-xs text-muted-foreground">
        Changes apply to this session only. The recurring schedule stays as it is.
      </p>

      <DialogFooter className="gap-2">
        {isCancelled ? (
          <Button variant="outline" onClick={() => handleStatus("SCHEDULED")} disabled={isPending}>
            Restore session
          </Button>
        ) : (
          <Button
            variant="destructive"
            onClick={() => handleStatus("CANCELLED")}
            disabled={isPending}
          >
            Cancel class
          </Button>
        )}
        <Button onClick={handleReschedule} disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </>
  );
}
