import { Globe2 } from "lucide-react";
import {
  getCoursePrices,
  getLanguageRows,
  getTeachingHours,
} from "@/features/settings/queries";
import { CoursePricesPanel } from "@/features/settings/components/course-prices-panel";
import { LanguagesPanel } from "@/features/settings/components/languages-panel";
import { TeachingHoursPanel } from "@/features/settings/components/teaching-hours-panel";
import { ChangePassword } from "@/features/auth/components/change-password";
import { getTeam } from "@/features/team/queries";
import { TeamPanel } from "@/features/team/components/team-panel";
import { canManageTeam } from "@/features/team/roles";
import { requireUser } from "@/lib/auth";
import { isAccountManagementConfigured } from "@/lib/supabase/admin";
import { DEFAULT_TIMEZONE } from "@/lib/datetime";
import { PageContainer, PageHeader, Section } from "@/components/shared/page";

export default async function SettingsPage() {
  const profile = await requireUser();
  const managesTeam = canManageTeam(profile.role);

  const [languages, hours, prices, team] = await Promise.all([
    getLanguageRows(),
    getTeachingHours(),
    getCoursePrices(),
    managesTeam ? getTeam() : Promise.resolve([]),
  ]);
  const offered = languages.filter((language) => language.active).length;

  return (
    <PageContainer>
      <PageHeader title="Settings" description="How DARPE is set up." />

      <div className="space-y-8">
        {/*
          Everything else on this page is DARPE's; this one section is the
          person's own, which is why it says whose account it is changing.
        */}
        <Section id="your-account" title="Your account" description={profile.email}>
          <ChangePassword hasOwnPassword={profile.passwordSetAt !== null} />
        </Section>

        {/* Only the owner and admins see who has an account and can add people. */}
        {managesTeam && (
          <Section title="Team" description={`${team.length} with access`}>
            <TeamPanel
              members={team}
              currentUserId={profile.id}
              configured={isAccountManagementConfigured()}
            />
          </Section>
        )}

        <Section title="Course prices" description="Monthly price per course">
          <CoursePricesPanel prices={prices} />
        </Section>

        <Section title="Teaching hours" description="The hours of a normal day at the academy">
          <TeachingHoursPanel hours={hours} />
        </Section>

        <Section
          title="Languages"
          description={`${offered} offered · ${languages.length} on record`}
        >
          <LanguagesPanel languages={languages} />
        </Section>

        <Section title="Time zone">
          <div className="flex flex-wrap items-start gap-3 rounded-xl border bg-card p-5 shadow-xs">
            <span
              aria-hidden="true"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-tone-blue text-tone-blue-fg"
            >
              <Globe2 className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{DEFAULT_TIMEZONE}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                All dates and times in DARPE use this time zone.
              </p>
            </div>
          </div>
        </Section>
      </div>
    </PageContainer>
  );
}
