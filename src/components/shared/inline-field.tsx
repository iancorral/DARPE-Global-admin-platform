"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Editing a record where you read it.
 *
 * DARPE's staff administer data all day; sending them to a separate form to
 * change one field means four navigations to fix a phone number, and a Save
 * button that writes ten fields when they meant to change one. So every record
 * page edits in place, and there is no `/edit` route in the product.
 *
 * The shape every field here shares:
 *
 * - **One field, one write.** Nothing else on the page is touched.
 * - **Optimistic.** The value changes the instant it is picked; the server's
 *   answer replaces it, or the old value comes back with an error toast.
 * - **Escape reverts, Enter commits, blur commits.** No Save button, because
 *   there is nothing else pending to save.
 *
 * `save` returns the app's usual result shape rather than throwing, so a
 * refused write shows the server's own message.
 */
export type SaveResult = { success: true } | { success: false; error: string };

/** A value shown as text, edited by clicking it. */
export function InlineText({
  value,
  save,
  label,
  placeholder = "Not set",
  type = "text",
  multiline = false,
  className,
  emptyClassName,
}: {
  value: string | null;
  save: (next: string) => Promise<SaveResult>;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  multiline?: boolean;
  className?: string;
  emptyClassName?: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pending, startTransition] = useTransition();

  const commit = () => {
    const next = draft.trim();
    setIsEditing(false);

    if (next === (value ?? "")) return;

    startTransition(async () => {
      const result = await save(next);

      if (!result.success) {
        setDraft(value ?? "");
        toast.error(result.error);
        return;
      }

      router.refresh();
    });
  };

  if (isEditing) {
    const shared = {
      autoFocus: true,
      value: draft,
      "aria-label": label,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(event.target.value),
      onBlur: commit,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Escape") {
          setDraft(value ?? "");
          setIsEditing(false);
        }
        // Enter commits a single-line field. A multi-line one may want line
        // breaks, so there it takes a modifier.
        if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          commit();
        }
      },
      className: cn(
        "w-full rounded-md border border-input bg-card px-2 py-1 text-sm",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        className
      ),
    };

    return multiline ? <textarea rows={3} {...shared} /> : <input type={type} {...shared} />;
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value ?? "");
        setIsEditing(true);
      }}
      className={cn(
        "group/edit -mx-2 flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-left",
        "transition-colors hover:bg-accent/50 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        pending && "opacity-50",
        className
      )}
    >
      <span
        className={cn(
          "min-w-0 flex-1",
          // A multi-line value reads as written; cutting it to one line hid
          // everything after the first sentence of a note.
          multiline ? "wrap-break-word whitespace-pre-wrap" : "truncate",
          value ? "" : cn("text-muted-foreground/70", emptyClassName)
        )}
      >
        {value || placeholder}
      </span>
      <Pencil
        aria-hidden="true"
        className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/edit:opacity-100 group-focus-visible/edit:opacity-100 motion-reduce:transition-none"
      />
    </button>
  );
}

/**
 * A value chosen from a list, edited in place.
 *
 * `render` decides what the closed control looks like, so the same component is
 * a status chip on one screen and a plain line of text on another. The
 * trigger's own caret is always hidden — a chevron inside a status pill made
 * the cell read as a form field rather than as a status.
 */
export function InlineSelect({
  value,
  items,
  save,
  label,
  render,
  triggerClassName,
}: {
  value: string;
  items: { label: string; value: string }[];
  save: (next: string) => Promise<SaveResult>;
  label: string;
  /** Draws the closed control from the currently selected option. */
  render: (current: { value: string; label: string | undefined }) => React.ReactNode;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<string | null>(null);

  const shown = optimistic ?? value;

  const onValueChange = (next: string) => {
    if (next === value) return;

    setOptimistic(next);
    startTransition(async () => {
      const result = await save(next);

      setOptimistic(null);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    // These live inside rows that are themselves links; opening a menu must not
    // navigate.
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      role="presentation"
      className="inline-flex max-w-full"
    >
      <Select
        items={items}
        value={shown}
        onValueChange={(next) => next !== null && onValueChange(String(next))}
      >
        <SelectTrigger
          aria-label={label}
          size="sm"
          className={cn(
            "h-auto w-auto max-w-full cursor-pointer border-0 bg-transparent p-0 shadow-none",
            "[&>svg]:hidden focus-visible:ring-0",
            pending && "opacity-50",
            triggerClassName
          )}
        >
          {render({
            value: shown,
            label: items.find((item) => item.value === shown)?.label,
          })}
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** A yes/no fact, toggled in place — active, closed, and the like. */
export function InlineToggle({
  checked,
  save,
  onLabel,
  offLabel,
  label,
}: {
  checked: boolean;
  save: (next: boolean) => Promise<SaveResult>;
  onLabel: string;
  offLabel: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const shown = optimistic ?? checked;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={shown}
      disabled={pending}
      onClick={() => {
        setOptimistic(!shown);
        startTransition(async () => {
          const result = await save(!shown);

          setOptimistic(null);

          if (!result.success) {
            toast.error(result.error);
            return;
          }

          router.refresh();
        });
      }}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        "transition-[filter,box-shadow] hover:shadow-xs hover:brightness-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "motion-reduce:transition-none",
        pending && "opacity-50",
        shown
          ? "border-tone-teal-line bg-tone-teal text-tone-teal-fg"
          : "border-border bg-muted text-muted-foreground"
      )}
    >
      {shown && <Check aria-hidden="true" className="size-3" />}
      {shown ? onLabel : offLabel}
    </button>
  );
}
