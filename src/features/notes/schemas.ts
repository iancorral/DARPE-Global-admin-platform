import { z } from "zod";

/**
 * Notes: private scratch space for each person — reminders, to-do lists,
 * anything that does not belong on a student's record.
 *
 * Kept to the handful of things a notes app is actually used for: a title,
 * free text, a checklist, a colour, an importance, a reminder day, pinning and
 * archiving when done. No labels or attachments — a feature nobody asked for
 * is one more thing between them and writing the note.
 *
 * A note is private until it is shared. A shared one joins the **team board**,
 * where every staff member can read and edit it and it can be pointed at one
 * person, because DARPE's own tracking sheet is a shared list with a
 * "Responsable" column and a private notebook could never replace it.
 */
export const NOTE_COLORS = ["amber", "rose", "teal", "blue", "violet", "moss"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

/**
 * How much a note is shouting, in DARPE's own words: their tracking sheet has
 * an "Importancia" column that only ever says urgente or importante. An
 * ordinary note has no priority at all rather than a third label nobody picks.
 */
export const NOTE_PRIORITIES = ["URGENT", "IMPORTANT"] as const;
export type NotePriority = (typeof NOTE_PRIORITIES)[number];

const id = z.string().min(1);
const title = z.string().trim().max(120, "Keep the title under 120 characters");
const body = z.string().trim().max(5000, "That note is too long");
const itemText = z.string().trim().min(1, "Write the item first").max(300);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const createNoteSchema = z
  .object({
    title: title.default(""),
    body: body.default(""),
    items: z.array(itemText).max(100).default([]),
    color: z.enum(NOTE_COLORS).nullable().default(null),
    /** True writes it straight onto the team board instead of the private list. */
    shared: z.boolean().default(false),
  })
  .refine((note) => note.title || note.body || note.items.length > 0, {
    message: "Write something first",
  });

export type CreateNoteInput = z.input<typeof createNoteSchema>;

/** One field at a time, the way every record in the app is edited. */
export const updateNoteSchema = z.discriminatedUnion("field", [
  z.object({ id, field: z.literal("title"), value: title }),
  z.object({ id, field: z.literal("body"), value: body }),
  z.object({ id, field: z.literal("color"), value: z.enum(NOTE_COLORS).nullable() }),
  z.object({ id, field: z.literal("priority"), value: z.enum(NOTE_PRIORITIES).nullable() }),
  z.object({ id, field: z.literal("shared"), value: z.boolean() }),
  z.object({ id, field: z.literal("assigneeId"), value: z.uuid().nullable() }),
  z.object({ id, field: z.literal("pinned"), value: z.boolean() }),
  z.object({ id, field: z.literal("archived"), value: z.boolean() }),
  z.object({ id, field: z.literal("dueOn"), value: dateOnly.nullable() }),
]);

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

export const addNoteItemSchema = z.object({ noteId: id, text: itemText });

export const updateNoteItemSchema = z.discriminatedUnion("field", [
  z.object({ id, field: z.literal("text"), value: itemText }),
  z.object({ id, field: z.literal("done"), value: z.boolean() }),
]);

export type UpdateNoteItemInput = z.infer<typeof updateNoteItemSchema>;

export const noteIdSchema = z.object({ id });
