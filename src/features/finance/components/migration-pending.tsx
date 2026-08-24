import { PageContainer, PageHeader } from "@/components/shared/page";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * What the money screens show before their migration has run.
 *
 * The payment tables ship in a migration, and a database that has not had it
 * applied would otherwise answer every query with a crash page. This says what
 * actually happened and which command fixes it — it is a deployment state, not
 * an error, and it disappears the moment the migration runs.
 */
export function MigrationPending({ title }: { title: string }) {
  return (
    <PageContainer>
      <PageHeader title={title} description="Waiting on a database migration" />
      <EmptyState>
        The payment tables are not on this database yet. Run{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          pnpm prisma migrate deploy
        </code>{" "}
        and reload — nothing else is needed.
      </EmptyState>
    </PageContainer>
  );
}
