"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { InitialsAvatar, LanguageChip } from "@/components/shared/identity";
import { INTERACTIVE_CARD } from "@/lib/interaction";
import { cn } from "@/lib/utils";
import { matchesSearch } from "@/lib/search";
import type { TeacherListRow } from "../queries";

/**
 * Active teachers are the working set, so they are the default view; inactive
 * ones remain reachable here because this list is the only place a teacher can
 * be found again and reactivated. Filtering happens on the client: the rows
 * are already loaded, and names stay out of the URL.
 */
type ActiveFilter = "ACTIVE" | "INACTIVE" | "ALL";

const FILTER_OPTIONS: { value: ActiveFilter; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ALL", label: "All" },
];

/**
 * Teachers as cards rather than table rows.
 *
 * There are few of them and each carries a small set of unlike facts — a name,
 * the languages they teach, how many students they hold — which a table forces
 * into columns that are mostly empty. A card puts them together, and the whole
 * card is one target.
 */
export function TeachersTable({ teachers }: { teachers: TeacherListRow[] }) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ACTIVE");

  const visible = teachers.filter((teacher) => {
    const activeOk =
      activeFilter === "ALL" || (activeFilter === "ACTIVE") === teacher.active;

    return activeOk && matchesSearch(query, [teacher.name, ...teacher.languageNames]);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2 sm:max-w-md">
          <Label htmlFor="teacher-search">Search</Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="teacher-search"
              type="search"
              placeholder="Name or language..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="bg-card pl-9 shadow-xs"
            />
          </div>
        </div>
        <div className="space-y-2 sm:w-40">
          <Label htmlFor="teacher-active-filter">Status</Label>
          <Select
            items={FILTER_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            value={activeFilter}
            onValueChange={(value) => value !== null && setActiveFilter(value as ActiveFilter)}
          >
            <SelectTrigger id="teacher-active-filter" className="w-full bg-card shadow-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState>
          {teachers.length === 0
            ? "No teachers yet. Create the first one to get started."
            : "No teachers match this search. Try a different name or language, or switch the status filter."}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((teacher) => (
            <li key={teacher.id}>
              <Link
                href={`/teachers/${teacher.id}`}
                className={cn(
                  "flex h-full flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs",
                  INTERACTIVE_CARD,
                  !teacher.active && "opacity-75"
                )}
              >
                <div className="flex items-start gap-3">
                  <InitialsAvatar name={teacher.name} className="size-11 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-base font-semibold">
                      {teacher.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {teacher.email ?? "No email on file"}
                    </p>
                  </div>
                  <Badge variant={teacher.active ? "default" : "outline"}>
                    {teacher.active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {teacher.languageNames.length > 0 ? (
                    teacher.languageNames.map((name) => (
                      <LanguageChip key={name} name={name} />
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No languages assigned
                    </span>
                  )}
                </div>

                <p className="mt-auto flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                  <Users aria-hidden="true" className="size-3.5" />
                  {teacher.studentCount}{" "}
                  {teacher.studentCount === 1 ? "student" : "students"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
