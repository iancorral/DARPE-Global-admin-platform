"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GraduationCap, StickyNote, UsersRound } from "lucide-react";
import { FormActions, FormCard, FormLayout, FormSection } from "@/components/shared/page";
import {
  SimilarRecords,
  SimilarRecordsInline,
} from "@/features/directory/components/similar-records";
import type { DirectoryEntry } from "@/features/directory/similar";
import { createGroup } from "../actions";
import { groupFormSchema, type GroupFormInput } from "../schemas";

type Teacher = { id: string; name: string; languageIds: string[] };
type Language = { id: string; name: string };

type Props = {
  teachers: Teacher[];
  languages: Language[];
  /** Every group on record, newest first — typing "Grupo" shows the numbers taken. */
  existing: DirectoryEntry[];
};

/**
 * Creating a group. Editing one happens on the group's own page, field by
 * field — see `inline-field.tsx`.
 */
export function GroupForm({ teachers, languages, existing }: Props) {
  const router = useRouter();

  const form = useForm<GroupFormInput>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: "", teacherId: "", languageId: "", notes: "" },
  });

  // `useWatch` rather than `form.watch()`: the subscription is memoizable, so
  // the component re-renders on this one field instead of on every keystroke.
  const languageId = useWatch({ control: form.control, name: "languageId" });
  const name = useWatch({ control: form.control, name: "name" });

  /*
   * Only teachers who actually teach the chosen language. The server checks the
   * same rule again, because this list goes stale while the form is open.
   */
  const eligibleTeachers = languageId
    ? teachers.filter((teacher) => teacher.languageIds.includes(languageId))
    : teachers;

  async function onSubmit(values: GroupFormInput) {
    const result = await createGroup(values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Group created");
    router.push(`/groups/${result.id}`);
  }

  return (
    <FormLayout
      aside={
        <SimilarRecords
          query={name ?? ""}
          entries={existing}
          noun={{ singular: "group", plural: "groups" }}
          className="hidden lg:block"
        />
      }
    >
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormCard>
          <FormSection title="Name" icon={UsersRound} tone="violet">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Grupo III" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <SimilarRecordsInline query={name ?? ""} entries={existing} className="lg:hidden" />
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
                    items={languages.map((language) => ({
                      label: language.name,
                      value: language.id,
                    }))}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // A teacher chosen for the old language may not teach the
                      // new one, so the choice is cleared rather than left wrong.
                      form.setValue("teacherId", "");
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {languages.map((language) => (
                        <SelectItem key={language.id} value={language.id}>
                          {language.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="teacherId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Teacher</FormLabel>
                  <Select
                    items={eligibleTeachers.map((teacher) => ({
                      label: teacher.name,
                      value: teacher.id,
                    }))}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a teacher" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eligibleTeachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
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

          </FormSection>

          <FormSection
            title="Notes"
            icon={StickyNote}
            tone="blue"
          >
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Notes <span className="text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </FormSection>

          <FormActions>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Create group"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </FormActions>
        </FormCard>
      </form>
    </Form>
    </FormLayout>
  );
}
