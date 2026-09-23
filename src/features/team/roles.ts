import type { UserRole } from "@/generated/prisma/client";

/**
 * Who may manage the team.
 *
 * Everyone signed in sees and edits everything the academy runs on — that is
 * DARPE's decision. The one thing a role gates is managing accounts: adding a
 * person and resetting a password. Dhanna (owner) and the app's maintainer
 * (admin) can; the members who run the day do not need to, and should not be
 * able to reset each other's passwords.
 *
 * `STAFF` reads as **Member** on screen (Ian, 2026-09-22): "Staff" sounded
 * like a lesser rank for people who see and do everything the owner does. The
 * stored value stays `STAFF`, so no migration and no data changes.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  STAFF: "Member",
};

/** Roles a manager can give a new account. There is one owner, set by hand. */
export const ASSIGNABLE_ROLES = ["STAFF", "ADMIN"] as const satisfies readonly UserRole[];

export function canManageTeam(role: UserRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/**
 * Whether `actor` may give `target` a new temporary password.
 *
 * An admin account is the maintainer's way in, and it has to stay open whatever
 * happens — a reset by mistake would lock out the one person who can fix the
 * app. So nobody resets an admin from the app, the owner included; an admin
 * changes their own password under Your account, and a forgotten one is
 * recovered in the Supabase dashboard, which only the maintainer holds.
 *
 * The app has no way to delete or disable an account either, so this is the
 * only lever that could have shut an admin out.
 */
export function canResetPasswordOf(actor: UserRole, target: UserRole): boolean {
  return canManageTeam(actor) && target !== "ADMIN";
}
