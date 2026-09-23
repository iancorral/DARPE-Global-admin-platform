import { describe, expect, it } from "vitest";
import { ASSIGNABLE_ROLES, ROLE_LABELS, canManageTeam, canResetPasswordOf } from "./roles";

describe("canManageTeam", () => {
  it("lets the owner and admins manage accounts, and nobody else", () => {
    expect(canManageTeam("OWNER")).toBe(true);
    expect(canManageTeam("ADMIN")).toBe(true);
    expect(canManageTeam("STAFF")).toBe(false);
  });
});

describe("canResetPasswordOf", () => {
  it("never lets anyone reset an admin, the owner included", () => {
    expect(canResetPasswordOf("OWNER", "ADMIN")).toBe(false);
    expect(canResetPasswordOf("ADMIN", "ADMIN")).toBe(false);
    expect(canResetPasswordOf("STAFF", "ADMIN")).toBe(false);
  });

  it("lets the owner and admins reset the owner and members", () => {
    expect(canResetPasswordOf("ADMIN", "OWNER")).toBe(true);
    expect(canResetPasswordOf("OWNER", "STAFF")).toBe(true);
    expect(canResetPasswordOf("ADMIN", "STAFF")).toBe(true);
  });

  it("gives members no resets at all", () => {
    expect(canResetPasswordOf("STAFF", "OWNER")).toBe(false);
    expect(canResetPasswordOf("STAFF", "STAFF")).toBe(false);
  });
});

describe("roles", () => {
  it("never offers the owner role to a new account", () => {
    expect(ASSIGNABLE_ROLES).not.toContain("OWNER");
  });

  it("labels every role, and calls staff members", () => {
    expect(Object.values(ROLE_LABELS).every((label) => label.length > 0)).toBe(true);
    expect(ROLE_LABELS.STAFF).toBe("Member");
  });
});
