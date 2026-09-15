"use client";

import { Languages, StickyNote, UserRound, Users } from "lucide-react";
import { InitialsAvatar, LanguageChip } from "@/components/shared/identity";
import { InlineSelect, InlineText, InlineToggle } from "@/components/shared/inline-field";
import { TONE_CLASSES } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { quickEditGroup } from "../actions";

export type GroupIdentity = {
  id: string;
  name: string;
  notes: string | null;
  active: boolean;
  memberCount: number;
  teacherId: string;
  teacherName: string;
  teacherActive: boolean;
  languageId: string;
  languageName: string;
};

/**
 * Everything about a group, edited where it is read.
 *
 * The server keeps its rules whatever the control looks like: a teacher must
 * teach the group's language, and the language is locked while the group has
 * members — they joined because they study the current one. Both come back as
 * an error toast rather than being hidden here, so staff are told *why* rather
 * than finding an option missing.
 */
export function GroupIdentityCard({
  group,
  teachers,
  languages,
  actions,
}: {
  group: GroupIdentity;
  teachers: { id: string; name: string }[];
  languages: { id: string; name: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-start gap-4 p-5 lg:p-6">
        <InitialsAvatar name={group.name} className="size-14 text-base" />

        <div className="min-w-0 flex-1">
          <InlineText
            value={group.name}
            save={(value) => quickEditGroup({ id: group.id, field: "name", value })}
            label="Group name"
            className="w-auto max-w-full font-serif text-2xl font-semibold tracking-tight"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <InlineToggle
              checked={group.active}
              label="Whether this group still runs"
              onLabel="Active"
              offLabel="Closed"
              save={(next) => quickEditGroup({ id: group.id, field: "active", value: next })}
            />
            <span className="text-sm text-muted-foreground">
              {group.memberCount} {group.memberCount === 1 ? "student" : "students"}
            </span>
            {group.active && !group.teacherActive && (
              <span className="text-sm font-medium text-tone-amber-fg">
                Teacher has left — needs a new one
              </span>
            )}
          </div>
        </div>

        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>

      <dl className="grid grid-cols-1 divide-x divide-y border-t sm:grid-cols-3 sm:divide-y-0">
        <Fact icon={UserRound} label="Teacher" tone="violet">
          <InlineSelect
            value={group.teacherId}
            label="Teacher"
            items={teachers.map((teacher) => ({ label: teacher.name, value: teacher.id }))}
            save={(value) => quickEditGroup({ id: group.id, field: "teacherId", value })}
            render={() => (
              <span
                className={cn(
                  "cursor-pointer rounded px-1 text-sm hover:bg-accent/50",
                  group.teacherActive ? "" : "font-medium text-tone-amber-fg"
                )}
              >
                {group.teacherName}
              </span>
            )}
          />
        </Fact>

        <Fact icon={Languages} label="Language" tone="teal">
          <InlineSelect
            value={group.languageId}
            label="Language"
            items={languages.map((language) => ({
              label: language.name,
              value: language.id,
            }))}
            save={(value) => quickEditGroup({ id: group.id, field: "languageId", value })}
            render={() => (
              <LanguageChip name={group.languageName} className="cursor-pointer" />
            )}
          />
        </Fact>

        <Fact icon={StickyNote} label="Notes" tone="blue">
          <InlineText
            value={group.notes}
            save={(value) => quickEditGroup({ id: group.id, field: "notes", value })}
            label="Notes"
            multiline
          />
        </Fact>
      </dl>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  tone,
  children,
}: {
  icon: typeof Users;
  label: string;
  tone: "violet" | "teal" | "blue";
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 px-5 py-4">
      <dt className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon aria-hidden="true" className={cn("size-3.5", TONE_CLASSES[tone].text)} />
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
