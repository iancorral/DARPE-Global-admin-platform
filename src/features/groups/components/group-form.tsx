"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FormActions, FormCard, FormSection } from "@/components/shared/page";
import { createGroup, updateGroup } from "../actions";
import { groupFormSchema, type GroupFormInput } from "../schemas";

type Teacher = { id: string; name: string; languageIds: string[] };
type Language = { id: string; name: string };

type Props = {
  teachers: Teacher[];
  languages: Language[];
  /** When present the form edits this group instead of creating one. */
  group?: { id: string; active: boolean } & GroupFormInput;
  /** True once the group has members: the language is then locked. */
  hasMembers?: boolean;
};

export function GroupForm({ teachers, languages, group, hasMembers = false }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(group?.active ?? true);

  const form = useForm<GroupFormInput>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: group ?? { name: "", teacherId: "", languageId: "", notes: "" },
  });

  // `useWatch` rather than `form.watch()`: the subscription is memoizable, so
  // the component re-renders on this one field instead of on every keystroke.
  const languageId = useWatch({ control: form.control, name: "languageId" });

  /*
   * Only teachers who actually teach the chosen language. The server checks the
   * same rule again, because this list goes stale while the form is open.
   */
  const eligibleTeachers = languageId
    ? teachers.filter((teacher) => teacher.languageIds.includes(languageId))
    : teachers;

  async function onSubmit(values: GroupFormInput) {
    if (group) {
      const result = await updateGroup({ id: group.id, active, ...values });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Group updated");
      router.push(`/groups/${group.id}`);
      return;
    }

    const result = await createGroup(values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Group created");
    router.push(`/groups/${result.id}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormCard>
          <FormSection title="The group" description="What it is called and what it studies.">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Grupo III" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

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
                    disabled={hasMembers}
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
                  {hasMembers && (
                    <p className="text-xs text-muted-foreground">
                      Locked while the group has members — they joined because they study
                      this language.
                    </p>
                  )}
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

          {group && (
            <FormSection title="Status" description="Whether the group is still running.">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="group-active"
                  checked={active}
                  onCheckedChange={(checked) => setActive(checked === true)}
                />
                <Label htmlFor="group-active" className="font-normal">
                  Active
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                A closed group keeps every class it already has and stops producing new
                ones. Nothing is deleted.
              </p>
            </FormSection>
          )}

          <FormActions>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? "Saving..."
                : group
                  ? "Save changes"
                  : "Create group"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </FormActions>
        </FormCard>
      </form>
    </Form>
  );
}
