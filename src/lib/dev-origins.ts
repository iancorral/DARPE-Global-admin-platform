/**
 * Which extra hosts may load `/_next/*` resources from `next dev`.
 *
 * `next dev` serves those only to the origin it was opened from, so reaching the
 * dev server from a phone on the LAN is a different origin and every client chunk
 * comes back 403 — the page renders but nothing hydrates.
 *
 * Next compares the request's **hostname** (lower-cased, with the protocol, port
 * and path already stripped) against each configured entry, matching either
 * exactly or by dot-separated wildcard segments. So `192.168.*.*` would admit
 * every host on every private class-C network, which is far more than "my phone".
 * Entries here are therefore exact hosts only: one line per device, named
 * deliberately.
 *
 * Development only — `next build` and `next start` never consult this.
 */

/** Longest a DNS name may be, and longest one of its labels may be. */
const MAX_HOSTNAME_LENGTH = 253;
const MAX_LABEL_LENGTH = 63;

/** One DNS label: alphanumeric, inner hyphens allowed, never starting or ending with one. */
const LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

const ALL_DIGITS = /^\d+$/;

function isIpv4(labels: string[]): boolean {
  return (
    labels.length === 4 &&
    labels.every(
      (label) =>
        ALL_DIGITS.test(label) &&
        label.length <= 3 &&
        Number(label) <= 255 &&
        // "01" and "192.168.01.1" are ambiguous rather than wrong; refuse them
        // instead of guessing which host was meant.
        (label === "0" || !label.startsWith("0"))
    )
  );
}

/**
 * Whether an entry is a bare host Next can actually match.
 *
 * Rejects anything carrying a scheme, port, path, credentials or wildcard. Those
 * are not "nearly right" — Next compares against a hostname alone, so an entry
 * like `http://192.168.1.69:3000` silently matches nothing while looking correct,
 * and a wildcard quietly widens access well beyond the device in front of you.
 */
export function isAllowedDevHost(value: string): boolean {
  if (value.length === 0 || value.length > MAX_HOSTNAME_LENGTH) return false;
  if (value !== value.toLowerCase()) return false;
  if (/[^a-z0-9.-]/.test(value)) return false;
  if (value.startsWith(".") || value.endsWith(".")) return false;

  const labels = value.split(".");
  if (labels.some((label) => label.length === 0 || label.length > MAX_LABEL_LENGTH)) {
    return false;
  }
  if (!labels.every((label) => LABEL.test(label))) return false;

  // An all-numeric value can only be meant as an address, so hold it to being a
  // real one: `192.168.1` and `3000` are mistakes, not hosts.
  if (labels.every((label) => ALL_DIGITS.test(label))) {
    return isIpv4(labels);
  }

  return true;
}

export type DevOrigins = {
  /** Valid hosts, de-duplicated, in the order they were written. */
  allowed: string[];
  /** Entries that were thrown away, so the caller can say so out loud. */
  rejected: string[];
};

/**
 * Reads `DEV_ALLOWED_ORIGINS`: a comma-separated list of exact hosts.
 *
 * Absent or empty means no extra hosts, which is the safe state — localhost keeps
 * working because Next always allows it, and nothing else is admitted. A malformed
 * entry is dropped and reported rather than passed through, so a typo can never
 * end up widening what the dev server will serve.
 */
export function parseDevOrigins(raw: string | undefined): DevOrigins {
  const allowed: string[] = [];
  const rejected: string[] = [];

  for (const part of raw?.split(",") ?? []) {
    const entry = part.trim();
    if (entry.length === 0) continue;

    const normalized = entry.toLowerCase();
    if (!isAllowedDevHost(normalized)) {
      rejected.push(entry);
      continue;
    }

    if (!allowed.includes(normalized)) allowed.push(normalized);
  }

  return { allowed, rejected };
}
