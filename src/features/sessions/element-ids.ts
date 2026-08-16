/**
 * DOM ids for the calendar's actionable controls.
 *
 * The phone agenda and the desktop week grid are both mounted at all times; CSS
 * decides which one is on screen. They therefore draw the same day and the same
 * time twice, and an id built only from date and time would exist twice in the
 * document — so `getElementById` could hand back the copy inside the hidden tree,
 * which is not focusable and silently swallows focus.
 *
 * Every id is scoped by the view that owns it, so the two trees can never collide
 * and a lookup always resolves within the view that asked.
 */

export type CalendarView = "grid" | "agenda";

/** A position offering to start a new class. */
export function createPositionId(
  view: CalendarView,
  date: string,
  startMinutes: number
): string {
  return `create-${view}-${date}-${startMinutes}`;
}

/** A position offering itself as somewhere to move the selected class. */
export function moveDestinationId(
  view: CalendarView,
  date: string,
  startMinutes: number
): string {
  return `move-${view}-${date}-${startMinutes}`;
}

/** A class card, which opens that class's details. */
export function sessionCardId(view: CalendarView, sessionId: string): string {
  return `session-${view}-${sessionId}`;
}

/** One half-hour row of the phone agenda, so it can be scrolled into view. */
export function agendaRowId(date: string, startMinutes: number): string {
  return `agenda-row-${date}-${startMinutes}`;
}
