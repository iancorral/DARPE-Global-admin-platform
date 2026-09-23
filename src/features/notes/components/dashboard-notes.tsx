"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Flag, Pin, Users } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { DashboardCard } from "@/components/shared/page";
import { TONE_CLASSES } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { updateNoteItem } from "../actions";
import { dueState } from "../due";
import { PRIORITY_CHIP } from "./note-card";
import type { NoteView } from "../queries";

const ITEMS_SHOWN = 4;

/**
 * Pinned notes and due reminders, on the dashboard where the day starts.
 *
 * Items can be ticked off right here; anything more — editing, adding — is one
 * click away on the notes page. Rendered only when there is something to show.
 */
export function DashboardNotes({
  notes,
  today,
  className,
}: {
  notes: NoteView[];
  today: string;
  className?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  function toggle(id: string, done: boolean) {
    setOptimistic((current) => ({ ...current, [id]: done }));
    startTransition(async () => {
      const result = await updateNoteItem({ id, field: "done", value: done });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <DashboardCard
      title="Your notes"
      description="Yours and what the team put on you"
      action={
        <Link
          href="/notes"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          All notes <ChevronRight aria-hidden="true" className="size-3.5" />
        </Link>
      }
      // Shares a fixed-height column with the inbox, so it scrolls inside
      // rather than pushing the inbox out of its card.
      className={cn("flex flex-col", className)}
      bodyClassName="min-h-0 overflow-y-auto"
    >
      <ul className="space-y-3">
        {notes.map((note) => {
          const due = dueState(note.dueOn, today);
          const open = note.items.filter((item) => !(optimistic[item.id] ?? item.done));
          const heading = note.title || note.body.split("\n")[0] || "Checklist";

          return (
            <li
              key={note.id}
              className={cn(
                "rounded-lg border p-3",
                note.color ? TONE_CLASSES[note.color].surface : "bg-card"
              )}
            >
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {note.priority ? (
                  <Flag
                    aria-label={PRIORITY_CHIP[note.priority].label}
                    className={cn(
                      "size-3.5 shrink-0 fill-current",
                      note.priority === "URGENT" ? "text-tone-rose-fg" : "text-tone-violet-fg"
                    )}
                  />
                ) : (
                  note.pinned && (
                    <Pin aria-hidden="true" className="size-3.5 shrink-0 fill-current text-primary" />
                  )
                )}
                <span className="min-w-0 flex-1 truncate">{heading}</span>
                {/* A task somebody put on the team board, not your own note. */}
                {note.shared && (
                  <Users aria-label="Team task" className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                {due === "overdue" && (
                  <span className={cn("rounded-full border px-1.5 text-[11px]", TONE_CLASSES.rose.chip)}>
                    Overdue
                  </span>
                )}
                {due === "today" && (
                  <span className={cn("rounded-full border px-1.5 text-[11px]", TONE_CLASSES.amber.chip)}>
                    Today
                  </span>
                )}
              </p>

              {open.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {open.slice(0, ITEMS_SHOWN).map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={false}
                        onCheckedChange={(checked) => toggle(item.id, checked)}
                        aria-label={`Tick ${item.text}`}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.text}</span>
                    </li>
                  ))}
                  {open.length > ITEMS_SHOWN && (
                    <li className="text-xs text-muted-foreground">
                      +{open.length - ITEMS_SHOWN} more
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </DashboardCard>
  );
}
