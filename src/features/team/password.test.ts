import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH } from "@/features/auth/schemas";
import { generateTemporaryPassword } from "./password";

describe("generateTemporaryPassword", () => {
  it("is three groups of four unambiguous characters", () => {
    const password = generateTemporaryPassword();

    expect(password).toMatch(/^[a-km-zA-HJ-NP-Z2-9]{4}-[a-km-zA-HJ-NP-Z2-9]{4}-[a-km-zA-HJ-NP-Z2-9]{4}$/);
    expect(password).not.toMatch(/[0O1lI]/);
  });

  it("is long enough to be accepted as a password", () => {
    expect(generateTemporaryPassword().length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
  });

  it("is different every time", () => {
    const passwords = new Set(Array.from({ length: 50 }, generateTemporaryPassword));
    expect(passwords.size).toBe(50);
  });
});
