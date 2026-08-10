"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { generateMonthlySessions, type GenerationConflict } from "@/features/schedules/actions";
import { addDaysToDate } from "@/lib/datetime";

const ALL_TEACHERS = "all";
const MAX_LISTED_CONFLICTS = 4;

type Props = {
  weekStart: string;
  todayWeekStart: string;
  teacherId?: string;
  teachers: { id: string; firstName: string; lastName: string }[];
  generationMonth: { year: number; month: number; label: string };
};

export function CalendarToolbar({
  weekStart,
  todayWeekStart,
  teacherId,
  teachers,
  generationMonth,
}: Props) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [conflicts, setConflicts] = useState<GenerationConflict[]>([]);

  const isBusy = isNavigating || isGenerating;

  function go(nextWeek: string, nextTeacher?: string) {
    setConflicts([]);
    const params = new URLSearchParams({ week: nextWeek });
    if (nextTeacher) params.set("teacher", nextTeacher);
    startNavigation(() => router.push(`/calendar?${params.toString()}`));
  }

  async function handleGenerate() {
    setIsGenerating(true);
    const result = await generateMonthlySessions({
      year: generationMonth.year,
      month: generationMonth.month,
    });
    setIsGenerating(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setConflicts(result.conflicts);

    if (result.conflicts.length > 0) {
      toast.warning(
        `${result.created} created · ${result.conflicts.length} skipped, teacher already booked`
      );
    } else if (result.created === 0 && result.skipped === 0) {
      toast.info(`No recurring schedule applies to ${generationMonth.label}`);
    } else if (result.created === 0) {
      toast.info(`${generationMonth.label} was already up to date`);
    } else {
      toast.success(`${result.created} sessions created · ${result.skipped} already existed`);
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 lg:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous week"
            disabled={isBusy}
            onClick={() => go(addDaysToDate(weekStart, -7), teacherId)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next week"
            disabled={isBusy}
            onClick={() => go(addDaysToDate(weekStart, 7), teacherId)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            disabled={isBusy || weekStart === todayWeekStart}
            onClick={() => go(todayWeekStart, teacherId)}
          >
            Today
          </Button>
        </div>

        <Select
          items={[
            { label: "All teachers", value: ALL_TEACHERS },
            ...teachers.map((t) => ({ label: `${t.firstName} ${t.lastName}`, value: t.id })),
          ]}
          value={teacherId ?? ALL_TEACHERS}
          onValueChange={(value) =>
            value !== null && go(weekStart, value === ALL_TEACHERS ? undefined : value)
          }
          disabled={isBusy}
        >
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TEACHERS}>All teachers</SelectItem>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.firstName} {t.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" onClick={handleGenerate} disabled={isBusy}>
          <RefreshCw className="size-4" />
          {isGenerating ? "Generating..." : `Generate ${generationMonth.label}`}
        </Button>
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs lg:text-right">
          <p className="font-medium">
            {conflicts.length} session{conflicts.length === 1 ? "" : "s"} not generated because the
            teacher already has a class at that time
          </p>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {conflicts.slice(0, MAX_LISTED_CONFLICTS).map((conflict) => (
              <li key={`${conflict.studentName}-${conflict.date}-${conflict.startLabel}`}>
                {conflict.studentName} with {conflict.teacherName} · {conflict.date}{" "}
                {conflict.startLabel}
              </li>
            ))}
            {conflicts.length > MAX_LISTED_CONFLICTS && (
              <li>and {conflicts.length - MAX_LISTED_CONFLICTS} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
