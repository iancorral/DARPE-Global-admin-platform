"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Search } from "lucide-react";
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
import { STUDENT_STATUSES, STUDENT_STATUS_LABELS } from "../schemas";
import type { StudentListRow } from "../queries";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  TRIAL: "secondary",
  PAUSED: "outline",
  ARCHIVED: "outline",
};

/**
 * "Current" hides archived students, the ones staff almost never need; every
 * other choice is one literal status. Filtering happens here on the client:
 * the rows are already loaded, carry no contact data, and at this team's scale
 * a round trip per keystroke would be all cost and no benefit. It also keeps
 * search text out of the URL, where a student's name does not belong.
 */
type StatusFilter = "CURRENT" | (typeof STUDENT_STATUSES)[number];

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "CURRENT", label: "All except archived" },
  ...STUDENT_STATUSES.map((status) => ({
    value: status as StatusFilter,
    label: STUDENT_STATUS_LABELS[status],
  })),
];

/**
 * Students as cards, matching the teachers list.
 *
 * A table put a person's name, language, level, teacher and status into five
 * columns that had to be read across; a card groups them around the person,
 * and the same card works from a phone to an ultrawide monitor without hiding
 * columns at breakpoints.
 */
export function StudentsTable({ students }: { students: StudentListRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("CURRENT");

  const visible = students.filter((student) => {
    const statusOk =
      statusFilter === "CURRENT"
        ? student.status !== "ARCHIVED"
        : student.status === statusFilter;

    return (
      statusOk &&
      matchesSearch(query, [
        student.name,
        student.languageName,
        student.teacherName,
        student.level,
      ])
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2 sm:max-w-md">
          <Label htmlFor="student-search">Search</Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="student-search"
              type="search"
              placeholder="Name, language, teacher..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="bg-card pl-9 shadow-xs"
            />
          </div>
        </div>
        <div className="space-y-2 sm:w-52">
          <Label htmlFor="student-status-filter">Status</Label>
          <Select
            items={FILTER_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            value={statusFilter}
            onValueChange={(value) => value !== null && setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger id="student-status-filter" className="w-full bg-card shadow-xs">
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
          {students.length === 0
            ? "No students yet. Create the first one to get started."
            : "No students match this search. Try a different name, or widen the status filter."}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((student) => (
            <li key={student.id}>
              <Link
                href={`/students/${student.id}`}
                className={cn(
                  "flex h-full flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs",
                  INTERACTIVE_CARD,
                  student.status === "ARCHIVED" && "opacity-75"
                )}
              >
                <div className="flex items-start gap-3">
                  <InitialsAvatar name={student.name} className="size-11 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-base font-semibold">
                      {student.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {student.level ? `Level ${student.level}` : "No level recorded"}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[student.status]}>
                    {STUDENT_STATUS_LABELS[student.status]}
                  </Badge>
                </div>

                <LanguageChip name={student.languageName} className="self-start" />

                <p className="mt-auto flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                  <GraduationCap aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate">{student.teacherName ?? "No primary teacher"}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
