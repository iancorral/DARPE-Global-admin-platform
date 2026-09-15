"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AtSign, Languages, Phone, StickyNote } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { InitialsAvatar, LanguageChip } from "@/components/shared/identity";
import { InlineText, InlineToggle } from "@/components/shared/inline-field";
import { TONE_CLASSES } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { quickEditTeacher } from "../actions";

export type TeacherIdentity = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  languageIds: string[];
  languageNames: string[];
};

/**
 * Everything about a teacher, edited where it is read.
 *
 * Same shape as the student card, for the same reason: no edit page, one field
 * per write, nothing saved that was not touched.
 */
export function TeacherIdentityCard({
  teacher,
  languages,
  actions,
}: {
  teacher: TeacherIdentity;
  languages: { id: string; name: string }[];
  actions?: React.ReactNode;
}) {
  const displayName =
    `${teacher.firstName} ${teacher.lastName ?? ""}`.trim() || teacher.firstName;

  const save = (field: "firstName" | "lastName" | "email" | "phone" | "notes") =>
    (value: string) =>
      quickEditTeacher({ id: teacher.id, field, value } as Parameters<
        typeof quickEditTeacher
      >[0]);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-start gap-4 p-5 lg:p-6">
        <InitialsAvatar name={displayName} className="size-14 text-base" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
            <InlineText
              value={teacher.firstName}
              save={save("firstName")}
              label="First name"
              className="w-auto max-w-full font-serif text-2xl font-semibold tracking-tight"
            />
            <InlineText
              value={teacher.lastName}
              save={save("lastName")}
              label="Last name"
              placeholder="Add surname"
              className="w-auto max-w-full font-serif text-2xl font-semibold tracking-tight"
              emptyClassName="text-lg font-sans font-normal"
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <InlineToggle
              checked={teacher.active}
              label="Whether this teacher takes new classes"
              onLabel="Active"
              offLabel="Archived"
              save={(next) =>
                quickEditTeacher({ id: teacher.id, field: "active", value: next })
              }
            />
            {teacher.languageNames.map((name) => (
              <LanguageChip key={name} name={name} />
            ))}
          </div>
        </div>

        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>

      <dl className="grid grid-cols-1 divide-x divide-y border-t sm:grid-cols-4 sm:divide-y-0">
        <Fact icon={AtSign} label="Email" tone="blue">
          <InlineText
            value={teacher.email}
            save={save("email")}
            label="Email"
            type="email"
          />
        </Fact>
        <Fact icon={Phone} label="Phone" tone="amber">
          <InlineText value={teacher.phone} save={save("phone")} label="Phone" type="tel" />
        </Fact>
        <Fact icon={StickyNote} label="Notes" tone="teal">
          <InlineText
            value={teacher.notes}
            save={save("notes")}
            label="Notes"
            multiline
          />
        </Fact>
        <Fact icon={Languages} label="Teaches" tone="violet">
          <LanguagePicker
            teacherId={teacher.id}
            selected={teacher.languageIds}
            languages={languages}
          />
        </Fact>
      </dl>
    </div>
  );
}

/**
 * The set of languages a teacher offers.
 *
 * Opens on click and writes the whole set at once, because that is what it is —
 * a set, not rows to add and remove one at a time. Refusing to save an empty
 * set is the server's rule; the button just cannot submit one.
 */
function LanguagePicker({
  teacherId,
  selected,
  languages,
}: {
  teacherId: string;
  selected: string[];
  languages: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(selected);
  const [pending, startTransition] = useTransition();

  const commit = (next: string[]) => {
    setDraft(next);

    if (next.length === 0) return;

    startTransition(async () => {
      const result = await quickEditTeacher({
        id: teacherId,
        field: "languageIds",
        value: next,
      });

      if (!result.success) {
        setDraft(selected);
        toast.error(result.error);
        return;
      }

      router.refresh();
    });
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(selected);
          setIsOpen(true);
        }}
        className={cn(
          "-mx-2 w-full cursor-pointer truncate rounded-md px-2 py-1 text-left text-sm",
          "transition-colors hover:bg-accent/50 focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
          pending && "opacity-50"
        )}
      >
        {selected.length} {selected.length === 1 ? "language" : "languages"}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-1.5">
        {languages.map((language) => (
          <label
            key={language.id}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <Checkbox
              checked={draft.includes(language.id)}
              onCheckedChange={(checked) =>
                commit(
                  checked
                    ? [...draft, language.id]
                    : draft.filter((id) => id !== language.id)
                )
              }
            />
            {language.name}
          </label>
        ))}
      </div>
      {draft.length === 0 && (
        <p className="text-xs text-tone-rose-fg">Pick at least one language.</p>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="cursor-pointer text-xs font-medium text-primary hover:underline"
      >
        Done
      </button>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  tone,
  children,
}: {
  icon: typeof AtSign;
  label: string;
  tone: "violet" | "teal" | "blue" | "amber";
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
