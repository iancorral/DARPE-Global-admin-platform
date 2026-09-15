"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { generateMonthlySessions } from "@/features/schedules/actions";
import type { GenerationConflict } from "@/features/schedules/action-results";
import { calendarUrl } from "../scheduling";
import { REQUEST_FAILED_MESSAGE } from "../request-feedback";
import { fullName } from "@/lib/names";

const ALL_TEACHERS = "all";
const MAX_LISTED_CONFLICTS = 4;

type Props = {
  weekStart: string;
  teacherId?: string;
  teachers: { id: string; firstName: string; lastName: string | null }[];
  generationMonth: { year: number; month: number; label: string };
  /** Carried through navigation so changing teacher does not drop an active move. */
  movingSessionId?: string;
};

/**
 * The calendar's two controls: whose classes to show, and generating the month.
 *
 * Moving between weeks is `WeekPager`, directly above the grid. A "Today"
 * button and a date picker used to sit here as well; both repeated what the
 * pager already shows, so they were removed (Ian, 2026-09-14). Getting back to
 * this week is a link inside the pager, and it only appears once you have left.
 *
 * Creating a class is deliberately not here either. A class needs a date and a
 * time, and the grid is where those are chosen.
 */
export function CalendarToolbar({
  weekStart,
  teacherId,
  teachers,
  generationMonth,
  movingSessionId,
}: Props) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [conflicts, setConflicts] = useState<GenerationConflict[]>([]);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      await runGeneration();
    } catch {
      toast.error(REQUEST_FAILED_MESSAGE);
    } finally {
      setIsGenerating(false);
    }
  }

  async function runGeneration() {
    const result = await generateMonthlySessions({
      year: generationMonth.year,
      month: generationMonth.month,
    });

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
        <Select
          items={[
            { label: "All teachers", value: ALL_TEACHERS },
            ...teachers.map((t) => ({ label: fullName(t), value: t.id })),
          ]}
          value={teacherId ?? ALL_TEACHERS}
          onValueChange={(value) =>
            value !== null &&
            router.push(
              calendarUrl({
                week: weekStart,
                teacher: value === ALL_TEACHERS ? undefined : value,
                moving: movingSessionId,
              })
            )
          }
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

        <Button variant="ghost" onClick={handleGenerate} disabled={isGenerating}>
          <RefreshCw className="size-4" />
          {isGenerating ? (
            "Generating..."
          ) : (
            // The month is already in the pager on a phone; spelling it out
            // again is what pushed this button onto a line of its own.
            <>
              <span className="sm:hidden">Generate month</span>
              <span className="hidden sm:inline">Generate {generationMonth.label}</span>
            </>
          )}
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
