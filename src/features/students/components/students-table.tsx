"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { InitialsAvatar, LanguageChip } from "@/components/shared/identity";
import { INTERACTIVE_ROW, INTERACTIVE_TABLE_ROW } from "@/lib/interaction";
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

const ALL_LANGUAGES = "ALL";

/**
 * Students as a table.
 *
 * Unlike teachers, of whom there are a handful, students are the list that
 * grows — and a long list is read by comparing down a column: who studies what,
 * at which level, with whom. Cards make that scan impossible past a dozen
 * records, so this is a table on desktop and record cards only on a phone,
 * where a six-column table cannot fit at all.
 */
export function StudentsTable({ students }: { students: StudentListRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("CURRENT");
  const [language, setLanguage] = useState<string>(ALL_LANGUAGES);

  // Only the languages these students actually study: a filter that offers a
  // language nobody takes is a dead end.
  const languages = [...new Set(students.map((student) => student.languageName))].sort(
    (a, b) => a.localeCompare(b)
  );

  const visible = students.filter((student) => {
    const statusOk =
      statusFilter === "CURRENT"
        ? student.status !== "ARCHIVED"
        : student.status === statusFilter;

    const languageOk = language === ALL_LANGUAGES || student.languageName === language;

    return (
      statusOk &&
      languageOk &&
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

      {languages.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by language">
          <LanguagePill
            label="All"
            isActive={language === ALL_LANGUAGES}
            onClick={() => setLanguage(ALL_LANGUAGES)}
          />
          {languages.map((name) => (
            <LanguagePill
              key={name}
              label={name}
              isActive={language === name}
              onClick={() => setLanguage(name)}
            />
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState>
          {students.length === 0
            ? "No students yet. Create the first one to get started."
            : "No students match these filters. Try a different name, language or status."}
        </EmptyState>
      ) : (
        <>
          {/* Record cards below `md`, where six columns cannot fit. */}
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs md:hidden">
            {visible.map((student) => (
              <li key={student.id}>
                <Link
                  href={`/students/${student.id}`}
                  className={cn("flex min-h-11 items-center gap-3 px-4 py-3", INTERACTIVE_ROW)}
                >
                  <InitialsAvatar name={student.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{student.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {student.languageName}
                      {student.level ? ` · ${student.level}` : ""} ·{" "}
                      {student.teacherName ?? "Unassigned"}
                    </span>
                  </span>
                  <Badge variant={STATUS_VARIANT[student.status]}>
                    {STUDENT_STATUS_LABELS[student.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((student) => (
                  <TableRow
                    key={student.id}
                    // `relative` anchors the stretched link that covers the row.
                    className={cn("group relative", INTERACTIVE_TABLE_ROW)}
                  >
                    <TableCell>
                      {/*
                        The link sits on the name and stretches over the row, so
                        the whole row is clickable while staying one link in the
                        tab order and to a screen reader.
                      */}
                      <Link
                        href={`/students/${student.id}`}
                        className="flex items-center gap-3 font-medium after:absolute after:inset-0 focus-visible:outline-none"
                      >
                        <InitialsAvatar name={student.name} className="size-8" />
                        <span className="truncate group-hover:underline">{student.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <LanguageChip name={student.languageName} />
                    </TableCell>
                    <TableCell className="tabular-nums">{student.level ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.teacherName ?? "Unassigned"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[student.status]}>
                        {STUDENT_STATUS_LABELS[student.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            {visible.length} of {students.length}{" "}
            {students.length === 1 ? "student" : "students"}
          </p>
        </>
      )}
    </div>
  );
}

function LanguagePill({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
