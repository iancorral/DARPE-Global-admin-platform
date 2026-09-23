import Link from "next/link";
import { AlertTriangle, Plus, Users } from "lucide-react";
import { getGroupRows } from "@/features/groups/queries";
import { EmptyState } from "@/components/shared/empty-state";
import { LanguageChip } from "@/components/shared/identity";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INTERACTIVE_CARD } from "@/lib/interaction";
import { cn } from "@/lib/utils";

export default async function GroupsPage() {
  const groups = await getGroupRows();
  const activeCount = groups.filter((group) => group.active).length;

  return (
    <PageContainer>
      <PageHeader
        title="Groups"
        description={
          groups.length === 0
            ? "Cohorts taught together — one teacher, one language"
            : `${activeCount} active · ${groups.length} total`
        }
        actions={
          <Button nativeButton={false} render={<Link href="/groups/new" />}>
            <Plus className="size-4" /> New group
          </Button>
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          action={
            <Button nativeButton={false} render={<Link href="/groups/new" />}>
              <Plus className="size-4" /> New group
            </Button>
          }
        >
          No groups yet. A group is a set of students taught together by one teacher in
          one language, with its own weekly schedule.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className={cn(
                  "flex h-full flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs",
                  INTERACTIVE_CARD,
                  !group.active && "opacity-75"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-serif text-base font-semibold">
                      {group.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {group.teacherName}
                    </p>
                    {group.active && !group.teacherActive && (
                      // Nothing else on the card would show it, and a group
                      // whose teacher has left produces no classes at all.
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-tone-amber-fg">
                        <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
                        Teacher has left — needs a new one
                      </p>
                    )}
                  </div>
                  <Badge variant={group.active ? "default" : "outline"}>
                    {group.active ? "Active" : "Archived"}
                  </Badge>
                </div>

                <LanguageChip name={group.languageName} className="self-start" />

                <p className="mt-auto flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                  <Users aria-hidden="true" className="size-3.5 shrink-0" />
                  {group.memberCount} {group.memberCount === 1 ? "student" : "students"}
                  {" · "}
                  {group.slotCount === 0
                    ? "no schedule"
                    : `${group.slotCount} ${group.slotCount === 1 ? "class" : "classes"} a week`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
