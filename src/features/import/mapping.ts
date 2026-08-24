import type { StudentStatus } from "@/generated/prisma/client";

/**
 * Turning one spreadsheet row into DARPE's records.
 *
 * Every function here is pure and total: it either returns a confident answer
 * or says it cannot, and never guesses. Anything it cannot decide comes back as
 * `null` so the importer can report the row instead of writing something
 * plausible-looking into the database.
 *
 * Nothing in this module reads a file or touches Prisma, so the rules can be
 * tested against made-up rows rather than against real student data.
 */

/** Lowercase, unaccented, collapsed whitespace — the form used for matching. */
export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const LANGUAGE_BY_SPANISH: Record<string, string> = {
  espanol: "Spanish",
  ingles: "English",
  frances: "French",
  italiano: "Italian",
  aleman: "German",
  japones: "Japanese",
  sueco: "Swedish",
};

/**
 * The English language name DARPE stores, from the Spanish one the register
 * uses. Unknown languages return null rather than being invented — the seven
 * the academy teaches are a closed set.
 */
export function languageFromSpanish(value: string): string | null {
  return LANGUAGE_BY_SPANISH[normalizeKey(value)] ?? null;
}

/**
 * A person's name split the way the schema stores it.
 *
 * The first word is the given name and everything after it the surname, which
 * is right for "Ana Beltrán Ruiz" and wrong for nobody in a Spanish-language
 * register. A single word gives an empty surname, which the caller must treat
 * as needing review — `lastName` is required.
 */
export function splitPersonName(full: string): { firstName: string; lastName: string } {
  const words = full.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);

  return {
    firstName: words[0] ?? "",
    lastName: words.slice(1).join(" "),
  };
}

/**
 * The register's ESTADO is a *payment* state, not a lifecycle one, so this is a
 * deliberate reading rather than a translation:
 *
 * - PAGADO, PENDIENTE and BENEFICIO are all people currently studying. Whether
 *   they have paid is a financial fact DARPE does not model yet, and it must
 *   not be smuggled in as a student status.
 * - INACTIVO is somebody who has stopped, which is PAUSED rather than ARCHIVED:
 *   archiving is the more final step and staff should choose it themselves.
 *
 * Anything unrecognised returns null so the row is reported, never defaulted.
 */
export function studentStatusFromEstado(estado: string): StudentStatus | null {
  switch (normalizeKey(estado)) {
    case "pagado":
    case "pendiente":
    case "beneficio":
      return "ACTIVE";
    case "inactivo":
      return "PAUSED";
    default:
      return null;
  }
}

export type MontoReading =
  | { kind: "amount"; amountCents: number; currency: "MXN" | "USD" }
  | { kind: "note"; text: string }
  | { kind: "empty" };

/**
 * What the MONTO column actually holds.
 *
 * The column mixes three things: a peso figure, a dollar figure written as
 * "380 USD", and free-text reminders like "asesoria" or "hablarle a finales de
 * agosto". Reading it as a number would turn the notes into zeroes, so each
 * kind is named and the caller decides what to do with it.
 *
 * Amounts are integer cents. Money never touches a float.
 */
export function readMonto(raw: string): MontoReading {
  const value = raw.trim();
  if (value === "") return { kind: "empty" };

  const usd = value.match(/^([\d,]+(?:\.\d+)?)\s*(?:usd|dls?|d[oó]lares)$/i);
  if (usd?.[1]) {
    return {
      kind: "amount",
      amountCents: Math.round(Number(usd[1].replace(/,/g, "")) * 100),
      currency: "USD",
    };
  }

  const plain = value.replace(/[$,\s]/g, "");
  if (/^\d+(\.\d+)?$/.test(plain)) {
    return { kind: "amount", amountCents: Math.round(Number(plain) * 100), currency: "MXN" };
  }

  return { kind: "note", text: value };
}

/** Excel's day zero. Serial 1 is 1900-01-01, with its famous phantom leap day. */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

/**
 * An Excel date serial as a real date, or null if it is not one.
 *
 * Bounded deliberately: a stray number in a date column should be reported, not
 * silently read as a day in 1902 or 2408.
 */
export function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial < 20000 || serial > 60000) return null;

  return new Date(EXCEL_EPOCH_MS + Math.round(serial) * 86_400_000);
}

/**
 * Whether a GRUPO cell names an actual group.
 *
 * The column also carries "CLASE MUESTRA" — a sample class, which describes how
 * the student arrived rather than a cohort they belong to. Treating it as a
 * group would create one nobody teaches.
 */
export function isGroupLabel(value: string): boolean {
  const key = normalizeKey(value);
  if (key === "") return false;

  return key.startsWith("grupo");
}

/** "GRUPO III" → "Grupo III": the name as DARPE would write it. */
export function groupDisplayName(value: string): string {
  const words = value.replace(/\s+/g, " ").trim().split(" ");

  return words
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word.toUpperCase()
    )
    .join(" ");
}
