"use client";

import { AtSign, CreditCard, GraduationCap, Phone, Target, UserRound } from "lucide-react";
import { InitialsAvatar, LanguageChip } from "@/components/shared/identity";
import { InlineSelect, InlineText } from "@/components/shared/inline-field";
import { TONE_CLASSES } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { planLabel } from "@/features/finance/pricing";
import { quickEditStudent } from "../actions";
import { MODALITIES } from "../schemas";
import { LevelCell, PayMethodCell, StatusCell } from "./quick-edit";
import type {
  BillingStatus,
  Modality,
  PaymentMethod,
  StudentStatus,
} from "@/generated/prisma/client";

const MODALITY_LABELS: Record<Modality, string> = {
  ADVISORY: "Advisory (per hour)",
  GROUP_EXTENSIVE: "Group extensive (8 h/month)",
  INDIVIDUAL_EXTENSIVE: "Individual extensive (8 h/month)",
  INDIVIDUAL_INTENSIVE: "Individual intensive (16 h/month)",
};

export type StudentIdentity = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  level: string | null;
  goal: string | null;
  modality: Modality;
  status: StudentStatus;
  billing: BillingStatus;
  payMethod: PaymentMethod | null;
  languageId: string;
  languageName: string;
  primaryTeacherId: string | null;
  primaryTeacherName: string | null;
};

/**
 * Everything about a student, edited where it is read.
 *
 * There is no separate edit page. Every value on this card is its own control
 * and its own one-field write, so changing a phone number is a click and a
 * keystroke rather than four navigations and a form submit that rewrites ten
 * columns. The pattern is the one CRMs settled on years ago — Notion, Linear,
 * Attio all put the record's fields on the record itself.
 *
 * Teachers are filtered to the student's language, matching the server's own
 * rule; a teacher already assigned is kept in the list whatever their languages
 * say, so opening a student can never silently drop their teacher.
 */
export function StudentIdentityCard({
  student,
  languages,
  teachers,
  actions,
}: {
  student: StudentIdentity;
  languages: { id: string; name: string }[];
  teachers: { id: string; name: string; languageIds?: string[] }[];
  /** Scheduling and other page-level buttons, rendered top right. */
  actions?: React.ReactNode;
}) {
  const displayName =
    `${student.firstName} ${student.lastName ?? ""}`.trim() || student.firstName;

  const eligibleTeachers = teachers.filter(
    (teacher) =>
      teacher.id === student.primaryTeacherId ||
      !teacher.languageIds ||
      teacher.languageIds.includes(student.languageId)
  );

  const save = (field: "firstName" | "lastName" | "email" | "phone" | "goal") =>
    (value: string) =>
      quickEditStudent({ id: student.id, field, value } as Parameters<
        typeof quickEditStudent
      >[0]);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-start gap-4 p-5 lg:p-6">
        <InitialsAvatar name={displayName} className="size-14 text-base" />

        <div className="min-w-0 flex-1">
          {/* The name is two fields, edited as two, read as one line. */}
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
            <InlineText
              value={student.firstName}
              save={save("firstName")}
              label="First name"
              className="w-auto max-w-full font-serif text-2xl font-semibold tracking-tight"
            />
            <InlineText
              value={student.lastName}
              save={save("lastName")}
              label="Last name"
              placeholder="Add surname"
              className="w-auto max-w-full font-serif text-2xl font-semibold tracking-tight"
              emptyClassName="text-lg font-sans font-normal"
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
            <StatusCell
              studentId={student.id}
              status={student.status}
              billing={student.billing}
            />

            <InlineSelect
              value={student.languageId}
              label="Language"
              items={languages.map((language) => ({
                label: language.name,
                value: language.id,
              }))}
              save={(value) =>
                quickEditStudent({ id: student.id, field: "languageId", value })
              }
              render={() => <LanguageChip name={student.languageName} className="cursor-pointer" />}
            />

            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>

            <InlineSelect
              value={student.modality}
              label="Modality"
              items={MODALITIES.map((modality) => ({
                label: MODALITY_LABELS[modality],
                value: modality,
              }))}
              save={(value) =>
                quickEditStudent({
                  id: student.id,
                  field: "modality",
                  value: value as Modality,
                })
              }
              render={() => (
                <span className="cursor-pointer rounded px-1 text-muted-foreground hover:bg-accent/50 hover:text-foreground">
                  {planLabel(student.modality)}
                </span>
              )}
            />

            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>

            <InlineSelect
              value={student.primaryTeacherId ?? ""}
              label="Primary teacher"
              items={[
                { label: "Unassigned", value: "" },
                ...eligibleTeachers.map((teacher) => ({
                  label: teacher.name,
                  value: teacher.id,
                })),
              ]}
              save={(value) =>
                quickEditStudent({ id: student.id, field: "primaryTeacherId", value })
              }
              render={() => (
                <span
                  className={cn(
                    "cursor-pointer rounded px-1 hover:bg-accent/50",
                    student.primaryTeacherName
                      ? "text-muted-foreground hover:text-foreground"
                      : "font-medium text-tone-amber-fg"
                  )}
                >
                  {student.primaryTeacherName ?? "No teacher"}
                </span>
              )}
            />
          </div>
        </div>

        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>

      {/* Five facts in a fixed grid: the same shape whether filled or not. */}
      <dl className="grid grid-cols-2 divide-x divide-y border-t sm:grid-cols-5 sm:divide-y-0">
        <Fact icon={GraduationCap} label="Level" tone="violet">
          <LevelCell studentId={student.id} level={student.level} />
        </Fact>

        <Fact icon={CreditCard} label="Pays by" tone="moss">
          <PayMethodCell studentId={student.id} payMethod={student.payMethod} />
        </Fact>

        <Fact icon={AtSign} label="Email" tone="blue">
          <InlineText
            value={student.email}
            save={save("email")}
            label="Email"
            type="email"
          />
        </Fact>

        <Fact icon={Phone} label="Phone" tone="amber">
          <InlineText value={student.phone} save={save("phone")} label="Phone" type="tel" />
        </Fact>

        <Fact icon={Target} label="Goal" tone="teal">
          <InlineText value={student.goal} save={save("goal")} label="Goal" multiline />
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
  icon: typeof UserRound;
  label: string;
  tone: "violet" | "teal" | "blue" | "amber" | "moss";
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
