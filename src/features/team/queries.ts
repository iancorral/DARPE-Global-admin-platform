import "server-only";
import { db } from "@/lib/db";
import type { UserRole } from "@/generated/prisma/client";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** False while they are still on the password somebody else chose. */
  hasOwnPassword: boolean;
};

const ROLE_ORDER: Record<UserRole, number> = { OWNER: 0, ADMIN: 1, STAFF: 2 };

/** Everyone with an account, owner first. */
export async function getTeam(): Promise<TeamMember[]> {
  const profiles = await db.profile.findMany({
    select: { id: true, name: true, email: true, role: true, passwordSetAt: true },
  });

  return profiles
    .map((profile) => ({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      hasOwnPassword: profile.passwordSetAt !== null,
    }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name));
}
