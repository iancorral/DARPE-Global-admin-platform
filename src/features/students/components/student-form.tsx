"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  calendarReturnUrl,
  type CalendarReturnContext,
} from "@/features/sessions/calendar-return";
import { AtSign, GraduationCap, UserRound } from "lucide-react";
import { FormActions, FormCard, FormLayout, FormSection } from "@/components/shared/page";
import {
  SimilarRecords,
  SimilarRecordsInline,
} from "@/features/directory/components/similar-records";
import type { DirectoryEntry } from "@/features/directory/similar";
import { createStudent } from "../actions";
import {
  studentFormSchema,
  BILLING_STATUSES,
  BILLING_STATUS_HINTS,
  BILLING_STATUS_LABELS,
  MODALITIES,
  STUDENT_LEVELS,
  STUDENT_STATUSES,
  STUDENT_STATUS_LABELS,
  type StudentFormInput,
} from "../schemas";
import { fullName } from "@/lib/names";

/** "Not set" is a real choice: DARPE has no level on file for most students. */
const LEVEL_ITEMS: { label: string; value: string }[] = [
  { label: "Not set", value: "" },
  ...STUDENT_LEVELS.map((level) => ({ label: level, value: level })),
];

const MODALITY_LABELS: Record<(typeof MODALITIES)[number], string> = {
  ADVISORY: "Advisory (per hour)",
  GROUP_EXTENSIVE: "Group extensive (8 h/month)",
  INDIVIDUAL_EXTENSIVE: "Individual extensive (8 h/month)",
  INDIVIDUAL_INTENSIVE: "Individual intensive (16 h/month)",
};

type Props = {
  languages: { id: string; name: string }[];
  /** Active teachers, narrowed to the chosen language as it is picked. */
  teachers: {
    id: string;
    firstName: string;
    lastName: string | null;
    languageIds?: string[];
    inactive?: boolean;
  }[];
  /**
   * Where on the calendar this student is being added from, when scheduling a
   * class is what led here. The form itself is unchanged either way — it gains no
   * scheduling fields — only where it goes afterwards.
   */
  calendarReturn?: CalendarReturnContext | null;
  /** Every student on record, newest first, to catch a duplicate while typing. */
  existing: DirectoryEntry[];
};

/**
 * Creating a student. Editing one happens on the student's own page, field by
 * field — see `inline-field.tsx`.
 */
export function StudentForm({ languages, teachers, calendarReturn, existing }: Props) {
  const router = useRouter();

  const form = useForm<StudentFormInput>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "",
      languageId: "", primaryTeacherId: "", modality: "INDIVIDUAL_EXTENSIVE",
      status: "ACTIVE", billing: "PENDING", level: "", goal: "",
    },
  });

  // `useWatch` rather than `form.watch()`: the subscription is memoizable, so
  // only this field's changes re-render the list below.
  const languageId = useWatch({ control: form.control, name: "languageId" });
  const [firstName, lastName] = useWatch({
    control: form.control,
    name: ["firstName", "lastName"],
  });
  const nameQuery = `${firstName ?? ""} ${lastName ?? ""}`;

  /*
   * Only teachers who teach the language chosen above, because a teacher who
   * does not is refused by the server anyway — offering them just invites an
   * error.
   */
  const eligibleTeachers = teachers.filter((teacher) => {
    if (!languageId || !teacher.languageIds) return true;

    return teacher.languageIds.includes(languageId);
  });

  async function onSubmit(values: StudentFormInput) {
    const result = await createStudent(values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Student created");

    // Back to the exact calendar position this started from, with the new student
    // ready to be scheduled. Nothing is created for them automatically: the class
    // still has to be reviewed and submitted.
    router.push(calendarReturn ? calendarReturnUrl(calendarReturn, result.id) : "/students");
  }

  return (
    <FormLayout
      aside={
        <SimilarRecords
          query={nameQuery}
          entries={existing}
          noun={{ singular: "student", plural: "students" }}
          className="hidden lg:block"
        />
      }
    >
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {calendarReturn && (
          <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
            Adding a student for the class on {calendarReturn.date} at {calendarReturn.time}.
            You will come back to that time once they are created.
          </p>
        )}

        <FormCard>
        <FormSection title="Who they are" icon={UserRound} tone="violet">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="firstName" render={({ field }) => (
            <FormItem>
              <FormLabel>First name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="lastName" render={({ field }) => (
            <FormItem>
              <FormLabel>Last name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <SimilarRecordsInline query={nameQuery} entries={existing} className="lg:hidden" />
        </FormSection>

        <FormSection
          title="Contact"
          icon={AtSign}
          tone="blue"
        >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email <span className="text-muted-foreground">(optional)</span></FormLabel>
              <FormControl><Input type="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone <span className="text-muted-foreground">(optional)</span></FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        </FormSection>

        <FormSection
          title="What they study"
          icon={GraduationCap}
          tone="teal"
        >
        <div className="grid gap-4 sm:grid-cols-2">
        <FormField control={form.control} name="languageId" render={({ field }) => (
          <FormItem>
            <FormLabel>Language</FormLabel>
                <Select
                items={languages.map((l) => ({ label: l.name, value: l.id }))}
                onValueChange={field.onChange}
                value={field.value}
                >
              <FormControl>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a language" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="primaryTeacherId" render={({ field }) => (
          <FormItem>
            <FormLabel>Primary teacher <span className="text-muted-foreground">(optional)</span></FormLabel>
            <Select
                items={eligibleTeachers.map((t) => ({
                  label: `${fullName(t)}${t.inactive ? " (inactive)" : ""}`,
                  value: t.id,
                }))}
                onValueChange={field.onChange}
                value={field.value}
                >
              <FormControl>
                <SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {eligibleTeachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {fullName(t)}
                    {t.inactive ? " (inactive)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {languageId
                ? "Only teachers who teach this language."
                : "Choose a language first."}
            </p>
            <FormMessage />
          </FormItem>
        )} />

        </div>

        <div className="grid gap-4 sm:grid-cols-2">
        <FormField control={form.control} name="modality" render={({ field }) => (
          <FormItem>
            <FormLabel>Modality</FormLabel>
            <Select
                items={MODALITIES.map((m) => ({ label: MODALITY_LABELS[m], value: m }))}
                onValueChange={field.onChange}
                value={field.value}
                >
              <FormControl>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {MODALITIES.map((m) => (
                  <SelectItem key={m} value={m}>{MODALITY_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select
                items={STUDENT_STATUSES.map((s) => ({ label: STUDENT_STATUS_LABELS[s], value: s }))}
                onValueChange={field.onChange}
                value={field.value}
                >
              <FormControl>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {STUDENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STUDENT_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="billing" render={({ field }) => (
          <FormItem>
            <FormLabel>Payment</FormLabel>
            <Select
                items={BILLING_STATUSES.map((b) => ({
                  label: BILLING_STATUS_LABELS[b],
                  value: b,
                }))}
                onValueChange={field.onChange}
                value={field.value}
                >
              <FormControl>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {BILLING_STATUSES.map((b) => (
                  <SelectItem key={b} value={b}>{BILLING_STATUS_LABELS[b]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {BILLING_STATUS_HINTS[field.value]}
            </p>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="level" render={({ field }) => (
          <FormItem>
            <FormLabel>Level <span className="text-muted-foreground">(optional)</span></FormLabel>
            <Select
                items={LEVEL_ITEMS}
                onValueChange={field.onChange}
                value={field.value ?? ""}
                >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {LEVEL_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        </div>

        <FormField control={form.control} name="goal" render={({ field }) => (
          <FormItem>
            <FormLabel>Goal <span className="text-muted-foreground">(optional)</span></FormLabel>
            <FormControl><Textarea rows={3} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        </FormSection>

        <FormActions>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Create student"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              calendarReturn ? router.push(calendarReturnUrl(calendarReturn)) : router.back()
            }
          >
            Cancel
          </Button>
        </FormActions>
        </FormCard>
      </form>
    </Form>
    </FormLayout>
  );
}