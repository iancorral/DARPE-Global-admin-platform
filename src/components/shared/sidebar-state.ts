/**
 * Whether the desktop sidebar is folded down to its icon rail.
 *
 * Kept in a cookie rather than `localStorage` so the server renders the right
 * width on the first paint: read from storage after hydration, the sidebar
 * would open wide and then snap shut on every page load. It is a per-browser
 * convenience, so nothing is stored anywhere else.
 */
export const SIDEBAR_COOKIE = "darpe-sidebar";
export const SIDEBAR_COLLAPSED = "collapsed";

/** A year: long enough to feel permanent, short enough to expire eventually. */
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
