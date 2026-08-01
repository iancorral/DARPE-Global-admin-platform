"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { createTeacher } from "../actions";
import { teacherFormSchema, type TeacherFormInput } from "../schemas";

type LanguageOption = { id: string; name: string };

export function TeacherForm({ languages }: { languages: LanguageOption[] }) {
  const router = useRouter();

  const form = useForm<TeacherFormInput>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", languageIds: [] },
  });

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-lg space-y-6">
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

        <FormField
          control={form.control}
          name="languageIds"
          render={() => (
            <FormItem>
              <FormLabel>Languages taught</FormLabel>
              <div className="grid gap-3 sm:grid-cols-2">
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

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Create teacher"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}