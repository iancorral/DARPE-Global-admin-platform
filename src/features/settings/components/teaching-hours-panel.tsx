"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { BusinessHours } from "@/features/sessions/business-hours";
import { updateTeachingHours } from "../actions";

/** "8" → "08:00", the way the calendar writes an hour. */
function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * The hours the academy normally teaches.
 *
 * Saving changes what the calendar *marks*, never what it *allows*: a class
 * outside these hours stays bookable, and existing classes never move. That
 * distinction is the whole point of the setting, so the panel says it plainly.
 */
export function TeachingHoursPanel({ hours }: { hours: BusinessHours }) {
  const router = useRouter();
  const [startHour, setStartHour] = useState(String(hours.startHour));
  const [endHour, setEndHour] = useState(String(hours.endHour));
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    Number(startHour) !== hours.startHour || Number(endHour) !== hours.endHour;
  const isValid = Number(startHour) < Number(endHour);

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await updateTeachingHours({
        dayStartHour: Number(startHour),
        dayEndHour: Number(endHour),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Teaching hours saved");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="day-start">Day starts</Label>
          <Select
            items={HOURS.map((hour) => ({ label: hourLabel(hour), value: String(hour) }))}
            value={startHour}
            onValueChange={(value) => value !== null && setStartHour(value)}
          >
            <SelectTrigger id="day-start" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((hour) => (
                <SelectItem key={hour} value={String(hour)}>
                  {hourLabel(hour)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="day-end">Day ends</Label>
          <Select
            items={HOURS.slice(1).map((hour) => ({
              label: hourLabel(hour),
              value: String(hour),
            }))}
            value={endHour}
            onValueChange={(value) => value !== null && setEndHour(value)}
          >
            <SelectTrigger id="day-end" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.slice(1).map((hour) => (
                <SelectItem key={hour} value={String(hour)}>
                  {hourLabel(hour)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isValid && (
        <p className="text-xs text-destructive">The day has to end after it starts.</p>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Classes can still be booked outside these hours — the calendar simply marks
        them as outside the normal day, which is what happens when a student is in
        another country. Changing this never moves a class that already exists.
      </p>

      <Button onClick={handleSave} disabled={isSaving || !hasChanges || !isValid}>
        {isSaving ? "Saving..." : "Save hours"}
      </Button>
    </div>
  );
}
