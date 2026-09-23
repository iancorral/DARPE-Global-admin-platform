"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TONE_CLASSES } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { createNote } from "../actions";
import { NOTE_COLORS, type NoteColor } from "../schemas";

/**
 * The one-line box that becomes a note.
 *
 * Closed it is a single "Take a note…" line with a checklist button beside it,
 * the way Google Keep does it: most notes are one thought, and getting to write
 * it should be one click. Open, it has a title, then text or a checklist.
 * Ctrl+Enter saves; Escape closes an empty one.
 */
export function NoteComposer({ shared = false }: { shared?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"text" | "list">("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [draftItem, setDraftItem] = useState("");
  const [color, setColor] = useState<NoteColor | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function reset() {
    setOpen(false);
    setTitle("");
    setBody("");
    setItems([]);
    setDraftItem("");
    setColor(null);
  }

  const listItems = [...items, draftItem].map((item) => item.trim()).filter(Boolean);
  const isEmpty = !title.trim() && (mode === "text" ? !body.trim() : listItems.length === 0);

  async function save() {
    if (isEmpty) {
      reset();
      return;
    }

    setIsSaving(true);
    try {
      const result = await createNote({
        title,
        body: mode === "text" ? body : "",
        items: mode === "list" ? listItems : [],
        color,
        // Written on the team board, so it is a team task from the start.
        shared,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      reset();
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  function start(nextMode: "text" | "list") {
    setMode(nextMode);
    setOpen(true);
  }

  if (!open) {
    return (
      <div className="mx-auto flex max-w-xl items-center rounded-xl border bg-card shadow-xs">
        <button
          type="button"
          onClick={() => start("text")}
          className="min-w-0 flex-1 px-4 py-3 text-left text-sm text-muted-foreground"
        >
          {shared ? "Add a task…" : "Take a note…"}
        </button>
        <button
          type="button"
          aria-label="New checklist"
          onClick={() => start("list")}
          className="mr-2 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        >
          <ListChecks className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto max-w-xl space-y-2 rounded-xl border p-3 shadow-sm",
        color ? TONE_CLASSES[color].surface : "bg-card"
      )}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          void save();
        }
        if (event.key === "Escape" && isEmpty) reset();
      }}
    >
      <input
        autoFocus={mode === "text"}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Title"
        aria-label="Title"
        className="w-full bg-transparent px-1 py-1 text-sm font-semibold outline-none placeholder:text-muted-foreground/70"
      />

      {mode === "text" ? (
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={shared ? "What needs doing?" : "Take a note…"}
          aria-label="Note"
          rows={3}
          className="w-full resize-none bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/70"
        />
      ) : (
        <ul className="space-y-1">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2 px-1 text-sm">
              <span aria-hidden="true" className="size-3.5 shrink-0 rounded-[4px] border border-input" />
              <span className="min-w-0 flex-1 truncate">{item}</span>
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          <li className="flex items-center gap-2 px-1">
            <Plus aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={draftItem}
              onChange={(event) => setDraftItem(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.ctrlKey && !event.metaKey) {
                  event.preventDefault();
                  if (draftItem.trim()) {
                    setItems((current) => [...current, draftItem.trim()]);
                    setDraftItem("");
                  }
                }
              }}
              placeholder="List item"
              aria-label="List item"
              className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </li>
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {[null, ...NOTE_COLORS].map((option) => (
          <button
            key={option ?? "none"}
            type="button"
            aria-label={option ?? "No colour"}
            aria-pressed={color === option}
            onClick={() => setColor(option)}
            className={cn(
              "size-5 rounded-full border-2",
              option ? TONE_CLASSES[option].dot : "bg-card",
              color === option ? "border-foreground" : "border-border"
            )}
          />
        ))}

        <span className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={reset} disabled={isSaving}>
            Close
          </Button>
          <Button size="sm" onClick={save} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </span>
      </div>
    </div>
  );
}
