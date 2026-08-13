"use client";

import { Move, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MovingSession } from "../queries";

type Props = {
  session: MovingSession;
  originalDayLabel: string;
  onCancel: () => void;
  disabled?: boolean;
};

/**
 * Says what move mode is doing while it is doing it: which class moved into this
 * mode, where it currently sits, and how to get out. Rendered above the grid so it
 * stays visible after navigating to another week.
 */
export function MoveBanner({ session, originalDayLabel, onCancel, disabled }: Props) {
  return (
    <div
      role="status"
      className="mb-3 flex flex-wrap items-start justify-between gap-3 rounded-md border border-violet-200 bg-violet-50 px-4 py-3"
    >
      <div className="flex min-w-0 items-start gap-2">
        <Move className="mt-0.5 size-4 shrink-0 text-violet-700" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Moving {session.studentName}</p>
          <p className="text-xs text-muted-foreground">
            Currently {originalDayLabel} at {session.startLabel} · {session.durationMinutes} min
            · {session.teacherName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a new time below, or change week first. Nothing is saved until you confirm.
          </p>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={onCancel} disabled={disabled}>
        <X className="size-4" /> Cancel move
      </Button>
    </div>
  );
}
