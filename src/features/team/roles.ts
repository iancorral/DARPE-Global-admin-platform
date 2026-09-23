import type { UserRole } from "@/generated/prisma/client";

/**
 * Who may manage the team.
 *
 * Everyone signed in sees and edits everything the academy runs on — that is
 * DARPE's decision. The one thing a role gates is managing accounts: adding a
 * person and resetting a password. Dhanna (owner) and the app's maintainer
 * (admin) can; the staff who run the day do not need to, and should not be able
 * to reset each other's passwords.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  STAFF: "Staff",
};

/** Roles a manager can give a new account. There is one owner, set by hand. */
export const ASSIGNABLE_ROLES = ["STAFF", "ADMIN"] as const satisfies readonly UserRole[];

export function canManageTeam(role: UserRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}
