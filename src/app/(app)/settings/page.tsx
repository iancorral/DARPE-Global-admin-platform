import { Globe2 } from "lucide-react";
import { getLanguageRows, getTeachingHours } from "@/features/settings/queries";
import { LanguagesPanel } from "@/features/settings/components/languages-panel";
import { TeachingHoursPanel } from "@/features/settings/components/teaching-hours-panel";
import { DEFAULT_TIMEZONE } from "@/lib/datetime";
import { PageContainer, PageHeader, Section } from "@/components/shared/page";

export default async function SettingsPage() {
  const [languages, hours] = await Promise.all([getLanguageRows(), getTeachingHours()]);
  const offered = languages.filter((language) => language.active).length;

  return (
    <PageContainer>
      <PageHeader title="Settings" description="How DARPE is set up." />

      <div className="space-y-8">
        <Section
          title="Teaching hours"
          description="The hours of a normal day at the academy"
        >
          <TeachingHoursPanel hours={hours} />
        </Section>

        <Section
          title="Languages"
          description={`${offered} offered · ${languages.length} on record`}
        >
          <LanguagesPanel languages={languages} />
        </Section>

        <Section title="Timezone" description="Used for every date and time in DARPE">
          <div className="flex flex-wrap items-start gap-3 rounded-xl border bg-card p-5 shadow-xs">
            <span
              aria-hidden="true"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-tone-blue text-tone-blue-fg"
            >
              <Globe2 className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{DEFAULT_TIMEZONE}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Every class time is shown in this zone, whoever is looking and wherever
                they are. A coordinator working from another country still sees the same
                schedule as everyone else.
              </p>
            </div>
          </div>
        </Section>
      </div>
    </PageContainer>
  );
}
