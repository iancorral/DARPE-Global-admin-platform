import { describe, expect, it } from "vitest";
import { ASSIGNABLE_ROLES, ROLE_LABELS, canManageTeam } from "./roles";

describe("canManageTeam", () => {
  it("lets the owner and admins manage accounts, and nobody else", () => {
    expect(canManageTeam("OWNER")).toBe(true);
    expect(canManageTeam("ADMIN")).toBe(true);
    expect(canManageTeam("STAFF")).toBe(false);
  });
});

describe("roles", () => {
  it("never offers the owner role to a new account", () => {
    expect(ASSIGNABLE_ROLES).not.toContain("OWNER");
  });

  it("labels every role", () => {
    expect(Object.values(ROLE_LABELS).every((label) => label.length > 0)).toBe(true);
  });
});
