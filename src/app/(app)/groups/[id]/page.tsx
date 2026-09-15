import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { getGroupDetail, getGroupFormOptions } from "@/features/groups/queries";
import { GroupIdentityCard } from "@/features/groups/components/group-identity";
import { GroupMembers } from "@/features/groups/components/group-members";
import { GroupSchedule } from "@/features/groups/components/group-schedule";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer, Section } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INTERACTIVE_ROW } from "@/lib/interaction";
import { cn } from "@/lib/utils";
import type { ClassStatus } from "@/generated/prisma/client";

const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const CLASS_STATUS_VARIANT: Record<ClassStatus, "default" | "secondary" | "outline"> = {
  SCHEDULED: "secondary",
  COMPLETED: "default",
  CANCELLED: "outline",
};

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [group, options] = await Promise.all([getGroupDetail(id), getGroupFormOptions()]);

  if (!group) notFound();

  return (
    <PageContainer>
      <Link
        href="/groups"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All groups
      </Link>

      <GroupIdentityCard
        group={{
          id: group.id,
          name: group.name,
          notes: group.notes,
          active: group.active,
          memberCount: group.members.length,
          teacherId: group.teacherId,
          teacherName: group.teacherName,
          teacherActive: group.teacherActive,
          languageId: group.languageId,
          languageName: group.languageName,
        }}
        teachers={options.teachers}
        languages={options.languages}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/calendar?teacher=${group.teacherId}`} />}
          >
            <CalendarDays className="size-4" /> Open calendar
          </Button>
        }
      />

      <div className="mt-6 space-y-8">
        <Section title="Students" description={`${group.members.length} in this group`}>
          <GroupMembers
            groupId={group.id}
            members={group.members}
            candidates={group.candidates}
            languageName={group.languageName}
          />
        </Section>

        <Section
          title="Weekly schedule"
          description="Generate the month from the calendar to turn these into classes"
        >
          <GroupSchedule
            groupId={group.id}
            slots={group.slots}
            canSchedule={group.members.length > 0}
          />
        </Section>

        <Section title="Upcoming classes">
          {group.upcoming.length === 0 ? (
            <EmptyState tone="compact">
              No upcoming classes. They appear once the month is generated from the
              calendar.
            </EmptyState>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
              {group.upcoming.map((session) => (
                <li key={session.id}>
                  <Link
                    href={session.weekHref}
                    className={cn(
                      "group flex min-h-11 items-center gap-3 px-4 py-3 text-sm",
                      INTERACTIVE_ROW
                    )}
                  >
                    <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
                      {session.dateLabel}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium group-hover:underline">
                        {session.startLabel} · {session.durationMinutes} min
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {session.participantCount}{" "}
                        {session.participantCount === 1 ? "student" : "students"}
                      </span>
                    </span>
                    <Badge variant={CLASS_STATUS_VARIANT[session.status]}>
                      {CLASS_STATUS_LABELS[session.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </PageContainer>
  );
}
