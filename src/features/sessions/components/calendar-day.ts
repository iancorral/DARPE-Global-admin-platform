/**
 * One column of the week, as the page prepares it for rendering.
 *
 * Shared by the desktop grid and the phone agenda so both label a day the same
 * way, and kept apart from either of them so neither has to import the other.
 */
export type CalendarDay = {
  date: string;
  label: string;
  dayNumber: string;
  isToday: boolean;
};
