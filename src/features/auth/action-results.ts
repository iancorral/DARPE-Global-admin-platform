/**
 * What the auth actions report back, as types only.
 *
 * Kept out of `actions.ts` for the same reason as the schedule result types: a
 * `"use server"` module may only export async Server Actions, and the login form
 * needs to name this shape for `useActionState` without importing from that
 * boundary.
 */

export type ActionState = { error: string } | null;
