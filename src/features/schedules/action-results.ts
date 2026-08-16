/**
 * What the schedule actions report back, as types only.
 *
 * These live outside `actions.ts` because a `"use server"` module is an action
 * entrypoint: every runtime export it has must be an async Server Action, and the
 * bundler builds that export list from the module itself. A type sitting there is
 * either erased or — when it is a re-export of an imported binding — survives into
 * the generated action module as a reference to a value that does not exist.
 *
 * Nothing here may import the database, auth, environment or `server-only`, so a
 * client component can name these shapes without pulling the server into its bundle.
 */

export type GenerationConflict = {
  studentName: string;
  teacherName: string;
  date: string;
  startLabel: string;
};

export type GenerateResult =
  | { success: true; created: number; skipped: number; conflicts: GenerationConflict[] }
  | { success: false; error: string };

/** How much a series edit actually changed, so the calendar can say so precisely. */
export type SeriesUpdateResult =
  | { success: true; updated: number; created: number; cancelled: number }
  | { success: false; error: string };

/** How many upcoming classes ending a series cancelled. */
export type SeriesEndResult =
  | { success: true; cancelled: number }
  | { success: false; error: string };
