"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { DateField } from "@/components/shared/date-field";
import { StartTimeSelect } from "@/features/sessions/components/start-time-select";
import { WEEKDAYS } from "@/features/schedules/schemas";
import { createGroupScheduleSlot, deactivateGroupScheduleSlot } from "../actions";
import type { GroupSlotRow } from "../queries";

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

/**
 * The group's weekly pattern.
 *
 * The teacher is the group's own, so it is not asked for again — one teacher
 * per group is the rule the whole model rests on. Generating the month then
 * turns each pattern into a class with every member on it.
 */
export function GroupSchedule({
  groupId,
  slots,
  canSchedule,
}: {
  groupId: string;
  slots: GroupSlotRow[];
  /** False while the group has no members: there would be nobody in the class. */
  canSchedule: boolean;
}) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("17:00");
  const [durationMinutes, setDurationMinutes] = useState("90");
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd() {
    setIsPending(true);
    try {
      const result = await createGroupScheduleSlot(groupId, {
        teacherId: "",
        weekday: Number(weekday),
        startTime,
        durationMinutes: Number(durationMinutes),
        startsOn,
        endsOn,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Schedule added");
      setIsAdding(false);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      const result = await deactivateGroupScheduleSlot(id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Schedule removed");
      router.refresh();
    } finally {
      setRemovingId(null);
      setConfirmingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {slots.length === 0 && !isAdding && (
        <EmptyState>
          {canSchedule
            ? "No weekly schedule yet. Add one, then generate the month from the calendar to turn it into classes."
            : "Add at least one student before giving the group a schedule."}
        </EmptyState>
      )}

      {slots.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
          {slots.map((slot) => (
            <li key={slot.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {WEEKDAYS.find((day) => day.value === slot.weekday)?.label} ·{" "}
                  {slot.startTime}
                </p>
                <p className="text-xs text-muted-foreground">
                  {slot.durationMinutes} min · from {toInputDate(slot.startsOn)}
                  {slot.endsOn ? ` to ${toInputDate(slot.endsOn)}` : " · no end date"}
                </p>
              </div>

              {confirmingId === slot.id ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={removingId === slot.id}
                    onClick={() => handleRemove(slot.id)}
                  >
                    {removingId === slot.id ? "Removing..." : "Remove"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                    Keep
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Remove schedule slot"
                  onClick={() => setConfirmingId(slot.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdding ? (
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-xs">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="group-weekday">Day</Label>
              <Select
                items={WEEKDAYS.map((day) => ({
                  label: day.label,
                  value: String(day.value),
                }))}
                value={weekday}
                onValueChange={(value) => value !== null && setWeekday(value)}
              >
                <SelectTrigger id="group-weekday" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-start-time">Start time</Label>
              <StartTimeSelect
                id="group-start-time"
                value={startTime}
                onValueChange={setStartTime}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-duration">Duration (minutes)</Label>
              <Input
                id="group-duration"
                type="number"
                min={15}
                step={15}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-starts-on">Starts on</Label>
              <DateField
                id="group-starts-on"
                value={startsOn}
                onChange={setStartsOn}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-ends-on">
                Ends on <span className="text-muted-foreground">(optional)</span>
              </Label>
              <DateField
                id="group-ends-on"
                value={endsOn}
                onChange={setEndsOn}
                min={startsOn}
                clearable
                placeholder="No end date"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleAdd} disabled={isPending}>
              {isPending ? "Saving..." : "Save schedule"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        canSchedule && (
          <Button variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="size-4" /> Add weekly schedule
          </Button>
        )
      )}
    </div>
  );
}
