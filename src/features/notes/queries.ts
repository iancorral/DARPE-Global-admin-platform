import "server-only";
import { db } from "@/lib/db";
import { formatDateOnly, parseDateOnly } from "@/lib/datetime";
import type { Prisma } from "@/generated/prisma/client";
import {
  NOTE_COLORS,
  NOTE_PRIORITIES,
  type NoteColor,
  type NotePriority,
} from "./schemas";

export type NoteItemView = { id: string; text: string; done: boolean };

export type NoteView = {
  id: string;
  title: string;
  body: string;
  color: NoteColor | null;
  priority: NotePriority | null;
  pinned: boolean;
  archived: boolean;
  dueOn: string | null;
  /** True once it is on the team board; false while it is the owner's own. */
  shared: boolean;
  /** Who a shared task is for, and who wrote it — both blank on a private note. */
  assigneeId: string | null;
  assigneeName: string | null;
  ownerName: string | null;
  items: NoteItemView[];
};

const NOTE_SELECT = {
  id: true,
  title: true,
  body: true,
  color: true,
  priority: true,
  pinned: true,
  archived: true,
  dueOn: true,
  shared: true,
  assigneeId: true,
  assignee: { select: { name: true } },
  owner: { select: { name: true } },
  items: {
    select: { id: true, text: true, done: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.NoteSelect;

type NoteRecord = Prisma.NoteGetPayload<{ select: typeof NOTE_SELECT }>;

function isNoteColor(value: string | null): value is NoteColor {
  return value !== null && (NOTE_COLORS as readonly string[]).includes(value);
}

function isNotePriority(value: string | null): value is NotePriority {
  return value !== null && (NOTE_PRIORITIES as readonly string[]).includes(value);
}

/**
 * Urgent first, then important, then the rest — the order their sheet is read
 * in. Sorted here rather than in SQL: the column is text, so the database
 * would order it alphabetically, and one person's notes are never many rows.
 */
function byPriority(notes: NoteView[]): NoteView[] {
  const rank = (note: NoteView) =>
    note.priority === "URGENT" ? 0 : note.priority === "IMPORTANT" ? 1 : 2;

  return [...notes].sort((a, b) => rank(a) - rank(b));
}

function toView(note: NoteRecord): NoteView {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    color: isNoteColor(note.color) ? note.color : null,
    priority: isNotePriority(note.priority) ? note.priority : null,
    pinned: note.pinned,
    archived: note.archived,
    dueOn: note.dueOn ? formatDateOnly(note.dueOn) : null,
    shared: note.shared,
    assigneeId: note.assigneeId,
    assigneeName: note.assignee?.name ?? null,
    ownerName: note.owner?.name ?? null,
    items: note.items,
  };
}

/**
 * The signed-in person's private notes — never anyone else's, and never the
 * team board. The owner is always the caller's own profile id, taken from the
 * session by the page, not from input.
 */
export async function getMyNotes(ownerId: string, archived: boolean): Promise<NoteView[]> {
  const notes = await db.note.findMany({
    where: { ownerId, archived, shared: false },
    select: NOTE_SELECT,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return byPriority(notes.map(toView));
}

/**
 * The team board: every shared task, whoever wrote it. The three staff share
 * one academy and already see everything in the app, so this is deliberately
 * not filtered by who is reading it.
 */
export async function getTeamNotes(archived: boolean): Promise<NoteView[]> {
  const notes = await db.note.findMany({
    where: { shared: true, archived },
    select: NOTE_SELECT,
    orderBy: [{ pinned: "desc" }, { dueOn: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
  });

  return byPriority(notes.map(toView));
}

/**
 * What belongs on the dashboard: from this person's own notes and from the
 * team tasks assigned to them, anything urgent or important, pinned, or due.
 * Urgent first, because that is the point of marking one. Team tasks nobody
 * has taken stay on the board — the dashboard is what *you* have to do.
 */
export async function getDashboardNotes(ownerId: string, today: string): Promise<NoteView[]> {
  const notes = await db.note.findMany({
    where: {
      archived: false,
      OR: [
        { ownerId, shared: false },
        { shared: true, assigneeId: ownerId },
      ],
      AND: {
        OR: [
          { priority: { in: [...NOTE_PRIORITIES] } },
          { pinned: true },
          { dueOn: { lte: parseDateOnly(today) } },
        ],
      },
    },
    select: NOTE_SELECT,
    orderBy: [{ dueOn: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
    take: 8,
  });

  return byPriority(notes.map(toView)).slice(0, 4);
}
