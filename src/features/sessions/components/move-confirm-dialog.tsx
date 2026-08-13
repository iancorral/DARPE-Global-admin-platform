"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatSlotTime } from "../scheduling";
import type { MovingSession } from "../queries";

export type PendingMove = {
  date: string;
  dayLabel: string;
  startMinutes: number;
  conflicts: boolean;
};

type Props = {
  session: MovingSession;
  move: PendingMove | null;
  originalDayLabel: string;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * The step between picking a destination and writing it. Nothing has changed yet
 * when this opens: closing it leaves the class exactly where it was.
 */
export function MoveConfirmDialog({
  session,
  move,
  originalDayLabel,
  isSaving,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Dialog open={move !== null} onOpenChange={(open) => !open && !isSaving && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        {move && (
          <>
            <DialogHeader>
              <DialogTitle>Move this class?</DialogTitle>
              <DialogDescription>
                {session.studentName} · {session.durationMinutes} min · {session.teacherName}
              </DialogDescription>
            </DialogHeader>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">From</dt>
                <dd className="text-right">
                  {originalDayLabel} at {session.startLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">To</dt>
                <dd className="text-right font-medium">
                  {move.dayLabel} at {formatSlotTime(move.startMinutes)}
                </dd>
              </div>
            </dl>

            {move.conflicts && (
              <p className="rounded-md border border-dashed border-rose-300 px-3 py-2 text-xs text-rose-700">
                {session.teacherName} looks busy at that time. The server will refuse the move
                if they are.
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                Keep current time
              </Button>
              <Button onClick={onConfirm} disabled={isSaving}>
                {isSaving ? "Moving..." : "Move class"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
