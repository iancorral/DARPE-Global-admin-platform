"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { FormActions, FormCard, FormSection } from "@/components/shared/page";
import { createStudent, updateStudent } from "../actions";
import {
  studentFormSchema,
  MODALITIES,
  STUDENT_STATUSES,
  STUDENT_STATUS_LABELS,
  type StudentFormInput,
} from "../schemas";

const MODALITY_LABELS: Record<(typeof MODALITIES)[number], string> = {
  ADVISORY: "Advisory (per hour)",
  GROUP_EXTENSIVE: "Group extensive (8 h/month)",
  INDIVIDUAL_EXTENSIVE: "Individual extensive (8 h/month)",
  INDIVIDUAL_INTENSIVE: "Individual intensive (16 h/month)",
};

type Props = {
  languages: { id: string; name: string }[];
  /**
   * Active teachers, plus — when editing — the student's current primary teacher
   * even if they have gone inactive, so opening the form never silently drops an
   * assignment that is still on the record.
   */
  teachers: { id: string; firstName: string; lastName: string; inactive?: boolean }[];
  /**
   * Where on the calendar this student is being added from, when scheduling a
   * class is what led here. The form itself is unchanged either way — it gains no
   * scheduling fields — only where it goes afterwards.
   */
  calendarReturn?: CalendarReturnContext | null;
  /**
   * When present, the form edits this student instead of creating one. The same
   * fields and the same schema; only the action and the destination change.
   */
  student?: { id: string } & StudentFormInput;
};

export function StudentForm({ languages, teachers, calendarReturn, student }: Props) {
  const router = useRouter();

  const form = useForm<StudentFormInput>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: student ?? {
      firstName: "", lastName: "", email: "", phone: "",
      languageId: "", primaryTeacherId: "", modality: "INDIVIDUAL_EXTENSIVE",
      status: "ACTIVE", level: "", goal: "",
    },
  });

  async function onSubmit(values: StudentFormInput) {
    if (student) {
      const result = await updateStudent({ id: student.id, ...values });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Student updated");
      router.push(`/students/${student.id}`);
      return;
    }

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {calendarReturn && (
          <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
            Adding a student for the class on {calendarReturn.date} at {calendarReturn.time}.
            You will come back to that time once they are created.
          </p>
        )}

        <FormCard>
        <FormSection title="Who they are" description="The name staff will search for.">
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
        </FormSection>

        <FormSection
          title="Contact"
          description="Optional. Kept internal — never shown outside the admin."
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
          description="Decides who can teach them and where they appear on the calendar."
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
                items={teachers.map((t) => ({
                  label: `${t.firstName} ${t.lastName}${t.inactive ? " (inactive)" : ""}`,
                  value: t.id,
                }))}
                onValueChange={field.onChange}
                value={field.value}
                >
              <FormControl>
                <SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                    {t.inactive ? " (inactive)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <p className="text-xs text-muted-foreground">
              Only active and trial students can be given new classes. Existing classes
              are kept either way.
            </p>
            <FormMessage />
          </FormItem>
        )} />

        </div>

        <FormField control={form.control} name="level" render={({ field }) => (
          <FormItem>
            <FormLabel>Level <span className="text-muted-foreground">(optional)</span></FormLabel>
            <FormControl><Input placeholder="A1, B2, Beginner..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

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
            {form.formState.isSubmitting
              ? "Saving..."
              : student
                ? "Save changes"
                : "Create student"}
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
  );
}