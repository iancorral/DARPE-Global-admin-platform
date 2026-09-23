"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive, ArchiveRestore, Check, Flag, Palette, Pin, Plus, Trash2, UserRound, Users, X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DateField } from "@/components/shared/date-field";
import { InlineText, type SaveResult } from "@/components/shared/inline-field";
import { TONE_CLASSES } from "@/lib/tone";
import { cn } from "@/lib/utils";
import {
  addNoteItem,
  clearCheckedItems,
  deleteNote,
  deleteNoteItem,
  updateNote,
  updateNoteItem,
} from "../actions";
import { dueState } from "../due";
import { NOTE_COLORS, type NoteColor, type NotePriority } from "../schemas";

/**
 * Importance cycles on one button — none, important, urgent — the three values
 * DARPE's own sheet uses. A menu for three states is three clicks where one
 * does.
 */
const NEXT_PRIORITY: Record<string, NotePriority | null> = {
  none: "IMPORTANT",
  IMPORTANT: "URGENT",
  URGENT: null,
};

export const PRIORITY_CHIP: Record<NotePriority, { label: string; tone: "rose" | "violet" }> = {
  URGENT: { label: "Urgent", tone: "rose" },
  IMPORTANT: { label: "Important", tone: "violet" },
};
import type { NoteItemView, NoteView } from "../queries";

const TOOL =
  "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";

/**
 * One note, edited where it sits — the title, the text, each checklist line.
 *
 * Nothing opens a separate editor: click a line to change it, tick a box, type
 * a new item and press Enter. Ticked items fold away under a count so the list
 * shows what is left to do.
 */
export function NoteCard({
  note,
  today,
  team = [],
}: {
  note: NoteView;
  today: string;
  /** The staff a shared task can be pointed at. Empty on the private board. */
  team?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newItem, setNewItem] = useState("");
  const [showPalette, setShowPalette] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  function run(action: () => Promise<SaveResult>, onDone?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  const items = note.items.map((item) => ({ ...item, done: optimistic[item.id] ?? item.done }));
  const open = items.filter((item) => !item.done);
  const checked = items.filter((item) => item.done);
  const due = dueState(note.dueOn, today);
  const tone = note.color ? TONE_CLASSES[note.color] : null;

  function toggle(item: NoteItemView, done: boolean) {
    setOptimistic((current) => ({ ...current, [item.id]: done }));
    run(() => updateNoteItem({ id: item.id, field: "done", value: done }));
  }

  function add() {
    const text = newItem.trim();
    if (!text) return;
    run(() => addNoteItem({ noteId: note.id, text }), () => setNewItem(""));
  }

  return (
    <article
      className={cn(
        "mb-4 break-inside-avoid rounded-xl border p-3 shadow-xs transition-shadow hover:shadow-sm motion-reduce:transition-none",
        tone ? tone.surface : "bg-card",
        pending && "opacity-70"
      )}
    >
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <InlineText
            value={note.title || null}
            placeholder="Title"
            label="Note title"
            className="font-semibold"
            save={(value) => updateNote({ id: note.id, field: "title", value })}
          />
        </div>
        <button
          type="button"
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
          aria-pressed={note.pinned}
          className={cn(TOOL, note.pinned && "text-primary")}
          onClick={() => run(() => updateNote({ id: note.id, field: "pinned", value: !note.pinned }))}
        >
          <Pin className={cn("size-4", note.pinned && "fill-current")} />
        </button>
      </div>

      {(note.body || items.length === 0) && (
        <InlineText
          value={note.body || null}
          placeholder="Add text"
          label="Note text"
          multiline
          className="text-sm"
          save={(value) => updateNote({ id: note.id, field: "body", value })}
        />
      )}

      {open.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {open.map((item) => (
            <ItemRow key={item.id} item={item} onToggle={toggle} run={run} />
          ))}
        </ul>
      )}

      <form
        className="mt-1 flex items-center gap-2 px-0.5"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <Plus aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder="List item"
          aria-label="Add a list item"
          className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </form>

      {checked.length > 0 && (
        <details className="mt-2 border-t pt-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            {checked.length} checked
          </summary>
          <ul className="mt-1 space-y-0.5">
            {checked.map((item) => (
              <ItemRow key={item.id} item={item} onToggle={toggle} run={run} />
            ))}
          </ul>
          <button
            type="button"
            className="mt-1 text-xs font-medium text-primary hover:underline"
            onClick={() => run(() => clearCheckedItems({ id: note.id }))}
          >
            Remove checked items
          </button>
        </details>
      )}

      {showPalette && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Note colour">
          <ColorDot
            label="No colour"
            selected={note.color === null}
            className="bg-card"
            onClick={() => run(() => updateNote({ id: note.id, field: "color", value: null }))}
          />
          {NOTE_COLORS.map((color) => (
            <ColorDot
              key={color}
              label={color}
              selected={note.color === color}
              className={TONE_CLASSES[color].dot}
              onClick={() =>
                run(() => updateNote({ id: note.id, field: "color", value: color as NoteColor }))
              }
            />
          ))}
        </div>
      )}

      {/* Who the task is for. Only on the team board — a private note is yours. */}
      {note.shared && team.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <UserRound aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          <Select
            items={[
              { label: "Anyone", value: "none" },
              ...team.map((person) => ({ label: person.name, value: person.id })),
            ]}
            value={note.assigneeId ?? "none"}
            onValueChange={(next) =>
              next !== null &&
              run(() =>
                updateNote({
                  id: note.id,
                  field: "assigneeId",
                  value: String(next) === "none" ? null : String(next),
                })
              )
            }
          >
            <SelectTrigger size="sm" aria-label="Who it is for" className="h-7 w-40 bg-card/60 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Anyone</SelectItem>
              {team.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <DateField
          value={note.dueOn ?? ""}
          onChange={(next) =>
            run(() => updateNote({ id: note.id, field: "dueOn", value: next || null }))
          }
          placeholder="Remind me"
          ariaLabel="Reminder day"
          clearable
          className="h-8 w-36 text-xs"
        />
        {note.priority && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
              TONE_CLASSES[PRIORITY_CHIP[note.priority].tone].chip
            )}
          >
            <Flag aria-hidden="true" className="size-3 fill-current" />
            {PRIORITY_CHIP[note.priority].label}
          </span>
        )}
        {due === "today" && (
          <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", TONE_CLASSES.amber.chip)}>
            Today
          </span>
        )}
        {due === "overdue" && (
          <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", TONE_CLASSES.rose.chip)}>
            Overdue
          </span>
        )}

        <span className="ml-auto flex items-center">
          <button
            type="button"
            aria-label={note.shared ? "Make private" : "Share with the team"}
            aria-pressed={note.shared}
            className={cn(TOOL, note.shared && "text-primary")}
            onClick={() =>
              run(() => updateNote({ id: note.id, field: "shared", value: !note.shared }))
            }
          >
            <Users className="size-4" />
          </button>
          <button
            type="button"
            aria-label={
              note.priority
                ? `Importance: ${PRIORITY_CHIP[note.priority].label}. Change it`
                : "Mark as important"
            }
            className={cn(
              TOOL,
              note.priority === "URGENT" && "text-tone-rose-fg",
              note.priority === "IMPORTANT" && "text-tone-violet-fg"
            )}
            onClick={() =>
              run(() =>
                updateNote({
                  id: note.id,
                  field: "priority",
                  value: NEXT_PRIORITY[note.priority ?? "none"] ?? null,
                })
              )
            }
          >
            <Flag className={cn("size-4", note.priority && "fill-current")} />
          </button>
          <button
            type="button"
            aria-label="Change colour"
            aria-expanded={showPalette}
            className={TOOL}
            onClick={() => setShowPalette((current) => !current)}
          >
            <Palette className="size-4" />
          </button>
          <button
            type="button"
            aria-label={note.archived ? "Restore note" : "Archive note"}
            className={TOOL}
            onClick={() =>
              run(() => updateNote({ id: note.id, field: "archived", value: !note.archived }))
            }
          >
            {note.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
          </button>
          {confirmDelete ? (
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs font-medium text-destructive hover:bg-destructive/10"
              onClick={() => run(() => deleteNote({ id: note.id }))}
              onBlur={() => setConfirmDelete(false)}
            >
              <Check className="size-3.5" /> Delete
            </button>
          ) : (
            <button
              type="button"
              aria-label="Delete note"
              className={TOOL}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </span>
      </div>
    </article>
  );
}

function ItemRow({
  item,
  onToggle,
  run,
}: {
  item: NoteItemView;
  onToggle: (item: NoteItemView, done: boolean) => void;
  run: (action: () => Promise<SaveResult>) => void;
}) {
  return (
    <li className="group/item flex items-center gap-2">
      <Checkbox
        checked={item.done}
        onCheckedChange={(checked) => onToggle(item, checked)}
        aria-label={item.done ? `Untick ${item.text}` : `Tick ${item.text}`}
      />
      <div className={cn("min-w-0 flex-1 text-sm", item.done && "text-muted-foreground line-through")}>
        <InlineText
          value={item.text}
          label="List item"
          save={(value) => updateNoteItem({ id: item.id, field: "text", value })}
        />
      </div>
      <button
        type="button"
        aria-label={`Remove ${item.text}`}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 hover:bg-foreground/5 focus-visible:opacity-100 motion-reduce:transition-none"
        onClick={() => run(() => deleteNoteItem({ id: item.id }))}
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

function ColorDot({
  label,
  selected,
  className,
  onClick,
}: {
  label: string;
  selected: boolean;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "size-6 rounded-full border-2 transition-transform hover:scale-110 motion-reduce:transition-none",
        className,
        selected ? "border-foreground" : "border-border"
      )}
    />
  );
}
