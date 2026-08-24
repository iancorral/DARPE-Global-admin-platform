/**
 * The single settings row's id.
 *
 * Settings are one small set of values with no natural key, so the row is a
 * singleton under a fixed id: reading them is a primary-key lookup rather than
 * "the first row, hopefully", and there is no way to end up with two.
 */
export const ACADEMY_SETTINGS_ID = "academy";
