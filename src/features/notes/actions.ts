"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseDateOnly } from "@/lib/datetime";
import { firstValidationMessage } from "@/features/sessions/schemas";
import {
  addNoteItemSchema,
  createNoteSchema,
  noteIdSchema,
  updateNoteItemSchema,
  updateNoteSchema,
  type CreateNoteInput,
  type UpdateNoteInput,
  type UpdateNoteItemInput,
} from "./schemas";

/**
 * Every action here is scoped by `reachable`.
 *
 * Nothing trusts an id from the client on its own: each write also filters on
 * who may touch that note, so an id that is somebody's private note simply
 * matches nothing. Private means private, including from an admin; a note on
 * the team board is a different thing and any staff member may work on it,
 * which is the point of putting it there.
 */
type ActionResult = { success: true } | { success: false; error: string };

const NOT_FOUND = "That note no longer exists.";

/** A note the signed-in person may read and write: their own, or a shared one. */
function reachable(profileId: string) {
  return { OR: [{ ownerId: profileId }, { shared: true }] };
}

function revalidateNotes() {
  revalidatePath("/notes");
  revalidatePath("/dashboard");
}

export async function createNote(input: CreateNoteInput): Promise<ActionResult> {
  const me = await requireUser();

  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstValidationMessage(parsed.error, "Write something first") };
  }

  const { title, body, items, color, shared } = parsed.data;

  await db.note.create({
    data: {
      ownerId: me.id,
      title,
      body,
      color,
      shared,
      items: { create: items.map((text, position) => ({ text, position })) },
    },
  });

  revalidateNotes();
  return { success: true };
}

export async function updateNote(input: UpdateNoteInput): Promise<ActionResult> {
  const me = await requireUser();

  const parsed = updateNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstValidationMessage(parsed.error, "That value is not valid.") };
  }

  const { id, field, value } = parsed.data;
  const data =
    field === "dueOn"
      ? { dueOn: value ? parseDateOnly(value) : null }
      : { [field]: value };

  const updated = await db.note.updateMany({ where: { id, ...reachable(me.id) }, data });
  if (updated.count === 0) return { success: false, error: NOT_FOUND };

  revalidateNotes();
  return { success: true };
}

export async function deleteNote(input: { id: string }): Promise<ActionResult> {
  const me = await requireUser();

  const parsed = noteIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: NOT_FOUND };

  await db.note.deleteMany({ where: { id: parsed.data.id, ...reachable(me.id) } });

  revalidateNotes();
  return { success: true };
}

export async function addNoteItem(input: { noteId: string; text: string }): Promise<ActionResult> {
  const me = await requireUser();

  const parsed = addNoteItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstValidationMessage(parsed.error, "Write the item first") };
  }

  const note = await db.note.findFirst({
    where: { id: parsed.data.noteId, ...reachable(me.id) },
    select: {
      id: true,
      items: { select: { position: true }, orderBy: { position: "desc" }, take: 1 },
    },
  });
  if (!note) return { success: false, error: NOT_FOUND };

  await db.noteItem.create({
    data: {
      noteId: note.id,
      text: parsed.data.text,
      position: (note.items[0]?.position ?? -1) + 1,
    },
  });

  revalidateNotes();
  return { success: true };
}

export async function updateNoteItem(input: UpdateNoteItemInput): Promise<ActionResult> {
  const me = await requireUser();

  const parsed = updateNoteItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstValidationMessage(parsed.error, "That value is not valid.") };
  }

  const { id, field, value } = parsed.data;

  const updated = await db.noteItem.updateMany({
    where: { id, note: reachable(me.id) },
    data: field === "done" ? { done: value } : { text: value },
  });
  if (updated.count === 0) return { success: false, error: NOT_FOUND };

  revalidateNotes();
  return { success: true };
}

export async function deleteNoteItem(input: { id: string }): Promise<ActionResult> {
  const me = await requireUser();

  const parsed = noteIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: NOT_FOUND };

  await db.noteItem.deleteMany({ where: { id: parsed.data.id, note: reachable(me.id) } });

  revalidateNotes();
  return { success: true };
}

/** Removes every ticked item from a checklist at once. */
export async function clearCheckedItems(input: { id: string }): Promise<ActionResult> {
  const me = await requireUser();

  const parsed = noteIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: NOT_FOUND };

  await db.noteItem.deleteMany({
    where: { noteId: parsed.data.id, done: true, note: reachable(me.id) },
  });

  revalidateNotes();
  return { success: true };
}
