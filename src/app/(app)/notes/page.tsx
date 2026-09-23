import Link from "next/link";
import { Archive, StickyNote } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { DEFAULT_TIMEZONE, todayInZone } from "@/lib/datetime";
import { getMyNotes, getTeamNotes } from "@/features/notes/queries";
import { NotesBoard } from "@/features/notes/components/notes-board";
import { getTeam } from "@/features/team/queries";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { TabSwitch } from "@/components/shared/tab-switch";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Two boards, one screen.
 *
 * **Mine** is private — nobody else reads it, not even an admin. **Team** is
 * the shared to-do the three of them work from, with a person and a day on
 * each task, because that is what DARPE's own tracking sheet is. Both are
 * notes, so both edit the same way.
 */
export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [me, params] = await Promise.all([requireUser(), searchParams]);
  const archived = params.view === "archived";
  const today = todayInZone(DEFAULT_TIMEZONE);

  const [mine, teamNotes, staff] = await Promise.all([
    getMyNotes(me.id, archived),
    getTeamNotes(archived),
    getTeam(),
  ]);

  const team = staff.map((person) => ({ id: person.id, name: person.name }));

  return (
    <PageContainer>
      <PageHeader
        title={archived ? "Archived notes" : "Notes"}
        description="Your notes are private. The team board is shared."
        actions={
          <Link
            href={archived ? "/notes" : "/notes?view=archived"}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {archived ? (
              <>
                <StickyNote className="size-4" /> Notes
              </>
            ) : (
              <>
                <Archive className="size-4" /> Archived
              </>
            )}
          </Link>
        }
      />

      <TabSwitch
        label="Notes view"
        defaultTab={params.board === "team" ? "team" : "mine"}
        tabs={[
          {
            id: "mine",
            label: "Mine",
            count: mine.length,
            content: <NotesBoard notes={mine} archived={archived} today={today} />,
          },
          {
            id: "team",
            label: "Team",
            count: teamNotes.length,
            content: (
              <NotesBoard
                notes={teamNotes}
                archived={archived}
                today={today}
                team={team}
                shared
              />
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
