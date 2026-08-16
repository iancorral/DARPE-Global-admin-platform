"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { FormActions, FormCard, FormSection } from "@/components/shared/page";
import { createTeacher, updateTeacher } from "../actions";
import { teacherFormSchema, type TeacherFormInput } from "../schemas";

type LanguageOption = { id: string; name: string };

type Props = {
  languages: LanguageOption[];
  /**
   * When present, the form edits this teacher instead of creating one. Only an
   * edit offers the active flag: a teacher is always created active.
   */
  teacher?: { id: string; active: boolean } & TeacherFormInput;
};

export function TeacherForm({ languages, teacher }: Props) {
  const router = useRouter();

  // Outside the form state on purpose: it needs no validation, and the create
  // schema knows nothing about it.
  const [active, setActive] = useState(teacher?.active ?? true);

  const form = useForm<TeacherFormInput>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: teacher ?? {
      firstName: "", lastName: "", email: "", phone: "", languageIds: [],
    },
  });

  async function onSubmit(values: TeacherFormInput) {
    const result = teacher
      ? await updateTeacher({ id: teacher.id, active, ...values })
      : await createTeacher(values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(teacher ? "Teacher updated" : "Teacher created");
    router.push("/teachers");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormCard>
        <FormSection title="Who they are" description="The name staff will search for.">
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
        </FormSection>

        <FormSection
          title="Contact"
          description="Optional. Teachers have no account — this is for staff to reach them."
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
          description="Only these languages can be scheduled with this teacher."
        >
        <FormField
          control={form.control}
          name="languageIds"
          render={() => (
            <FormItem>
              <FormLabel>Languages taught</FormLabel>
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

        {teacher && (
          <FormSection title="Availability" description="Whether new classes can be booked.">
          <div className="space-y-2 rounded-md border p-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="teacher-active"
                checked={active}
                onCheckedChange={(checked) => setActive(checked === true)}
              />
              <Label htmlFor="teacher-active" className="font-normal">
                Active
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Inactive teachers cannot be given new classes and stop appearing when
              scheduling. Classes they already have are kept.
            </p>
          </div>
          </FormSection>
        )}

        <FormActions>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "Saving..."
              : teacher
                ? "Save changes"
                : "Create teacher"}
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