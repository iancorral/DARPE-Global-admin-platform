import { Prisma } from "@/generated/prisma/client";

/**
 * True when a query failed because its table is not on this database yet.
 *
 * Prisma's P2021. It means one thing only — the migration that creates the
 * table has not run here — so a screen can say exactly that instead of showing
 * a crash. Never use it to swallow anything else: every other Prisma error is a
 * real fault and must surface.
 */
export function isMissingTable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}
