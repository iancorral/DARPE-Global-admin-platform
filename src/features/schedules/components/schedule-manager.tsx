"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StartTimeSelect } from "@/features/sessions/components/start-time-select";
import { createScheduleSlot, deactivateScheduleSlot } from "../actions";
import { WEEKDAYS } from "../schemas";

type Slot = {
  id: string;
  weekday: number;
  startTime: string;
  durationMinutes: number;
  startsOn: Date;
  endsOn: Date | null;
  teacher: { id: string; firstName: string; lastName: string };
};

function toInputDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function today() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

type Props = {
  studentId: string;
  slots: Slot[];
  teachers: { id: string; firstName: string; lastName: string }[];
};

export function ScheduleManager({ studentId, slots, teachers }: Props) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleAdd() {
    setIsPending(true);
    const result = await createScheduleSlot({
      studentId,
      teacherId,
      weekday: Number(weekday),
      startTime,
      durationMinutes: Number(durationMinutes),
      startsOn,
      endsOn,
    });
    setIsPending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Schedule slot added");
    setIsAdding(false);
    router.refresh();
  }

  async function handleRemove(id: string) {
    const result = await deactivateScheduleSlot(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Schedule slot removed");
    router.refresh();
  }

  const weeklyMinutes = slots.reduce((total, slot) => total + slot.durationMinutes, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm">Weekly schedule</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {slots.length} sessions · {(weeklyMinutes / 60).toFixed(1)} h per week
          </p>
        </div>
        {!isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="size-4" /> Add
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {slots.length === 0 && !isAdding && (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No recurring schedule yet.
          </p>
        )}

        {slots.map((slot) => (
          <div
            key={slot.id}
            className="flex items-center justify-between gap-4 rounded-md border p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {WEEKDAYS.find((d) => d.value === slot.weekday)?.label} · {slot.startTime}
              </p>
              <p className="text-xs text-muted-foreground">
                {slot.durationMinutes} min · {slot.teacher.firstName} {slot.teacher.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                From {toInputDate(slot.startsOn)}
                {slot.endsOn ? ` to ${toInputDate(slot.endsOn)}` : " · no end date"}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => handleRemove(slot.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        {isAdding && (
          <div className="space-y-4 rounded-md border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Teacher</Label>
                <Select
                  items={teachers.map((t) => ({
                    label: `${t.firstName} ${t.lastName}`,
                    value: t.id,
                  }))}
                  value={teacherId}
                  onValueChange={(value) => value !== null && setTeacherId(value)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Day</Label>
                <Select
                  items={WEEKDAYS.map((d) => ({ label: d.label, value: String(d.value) }))}
                  value={weekday}
                  onValueChange={(value) => value !== null && setWeekday(value)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slot-start-time">Start time</Label>
                <StartTimeSelect
                  id="slot-start-time"
                  value={startTime}
                  onValueChange={setStartTime}
                />
              </div>

              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Starts on</Label>
                <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Ends on (optional)</Label>
                <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={isPending}>
                {isPending ? "Saving..." : "Save slot"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}