"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { AtSign, Languages, UserRound } from "lucide-react";
import { FormActions, FormCard, FormLayout, FormSection } from "@/components/shared/page";
import {
  SimilarRecords,
  SimilarRecordsInline,
} from "@/features/directory/components/similar-records";
import type { DirectoryEntry } from "@/features/directory/similar";
import { createTeacher } from "../actions";
import { teacherFormSchema, type TeacherFormInput } from "../schemas";

type LanguageOption = { id: string; name: string };

type Props = {
  languages: LanguageOption[];
  /** Every teacher on record, newest first, to catch a duplicate while typing. */
  existing: DirectoryEntry[];
};

/**
 * Creating a teacher. Editing one happens on their own page, field by field —
 * see `inline-field.tsx`. A teacher is always created active.
 */
export function TeacherForm({ languages, existing }: Props) {
  const router = useRouter();

  const form = useForm<TeacherFormInput>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "", languageIds: [],
    },
  });

  const [firstName, lastName] = useWatch({
    control: form.control,
    name: ["firstName", "lastName"],
  });
  const nameQuery = `${firstName ?? ""} ${lastName ?? ""}`;

  async function onSubmit(values: TeacherFormInput) {
    const result = await createTeacher(values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Teacher created");
    router.push("/teachers");
  }

  return (
    <FormLayout
      aside={
        <SimilarRecords
          query={nameQuery}
          entries={existing}
          noun={{ singular: "teacher", plural: "teachers" }}
          className="hidden lg:block"
        />
      }
    >
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormCard>
        <FormSection title="Who they are" icon={UserRound} tone="violet">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <SimilarRecordsInline query={nameQuery} entries={existing} className="lg:hidden" />
        </FormSection>

        <FormSection
          title="Contact"
          icon={AtSign}
          tone="blue"
        >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email <span className="text-muted-foreground">(optional)</span></FormLabel>
              <FormControl><Input type="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone <span className="text-muted-foreground">(optional)</span></FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        </FormSection>

        <FormSection
          title="Languages taught"
          icon={Languages}
          tone="teal"
        >
        <FormField
          control={form.control}
          name="languageIds"
          render={() => (
            <FormItem>
              {/* No label: the section heading above already says this. */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {languages.map((language) => (
                  <FormField
                    key={language.id}
                    control={form.control}
                    name="languageIds"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(language.id)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked
                                  ? [...field.value, language.id]
                                  : field.value.filter((id) => id !== language.id)
                              )
                            }
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{language.name}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        </FormSection>



        <FormActions>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Create teacher"}
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