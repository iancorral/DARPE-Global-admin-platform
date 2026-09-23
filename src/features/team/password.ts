/**
 * A temporary password that survives being read aloud or typed from a message:
 * no 0/O or 1/l/I, and split into three groups of four.
 *
 * Only ever temporary — the person replaces it the first time they sign in, and
 * the dashboard keeps asking until they do.
 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTemporaryPassword(): string {
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);

  const chars = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)]
    .map((group) => group.join(""))
    .join("-");
}
