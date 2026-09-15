"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { InitialsAvatar, LanguageChip } from "@/components/shared/identity";
import { cn } from "@/lib/utils";
import { matchesSearch } from "@/lib/search";
import { TONE_CLASSES } from "@/lib/tone";
import { STUDENT_STATUSES, STUDENT_STATUS_LABELS } from "../schemas";
import { statusChip } from "../status-chip";
import { LevelCell, StatusCell } from "./quick-edit";
import type { StudentListRow } from "../queries";
import type { BillingStatus, StudentStatus } from "@/generated/prisma/client";

/** Neutral chip classes, for an arrangement rather than a state to act on. */
const NEUTRAL_CHIP = "bg-muted text-muted-foreground border-border";

/**
 * The single label DARPE reads on a student, coloured the way their own
 * register colours it. The rule itself lives in `statusChip`.
 */
function StatusBadge({ status, billing }: { status: StudentStatus; billing: BillingStatus }) {
  const chip = statusChip(status, billing);

  return (
    <Badge
      variant="outline"
      className={chip.tone ? TONE_CLASSES[chip.tone].chip : NEUTRAL_CHIP}
    >
      {chip.label}
    </Badge>
  );
}

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
      {/*
        `items-start` with both controls forced to the same height. With
        `items-end` and two different control heights, the two labels sat at
        different heights — exactly the misalignment it looked like.
      */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-1.5 sm:max-w-md">
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
              className="h-10 bg-card pl-9 shadow-xs"
            />
          </div>
        </div>
        <div className="space-y-1.5 sm:w-56">
          <Label htmlFor="student-status-filter">Status</Label>
          <Select
            items={FILTER_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            value={statusFilter}
            onValueChange={(value) => value !== null && setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger id="student-status-filter" className="h-10 w-full bg-card shadow-xs">
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
        /*
         * One scrolling row on a phone, wrapping from `sm` up. Nine language
         * pills wrapped onto three lines pushed the list itself below the fold
         * before a single student was visible; a row that scrolls sideways is
         * the pattern every mobile filter bar uses, and it keeps the data on
         * screen. `-mx-4 px-4` lets the row bleed to the screen edges so the
         * last pill does not look clipped by the page padding.
         */
        <div
          className={cn(
            "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
          )}
          role="group"
          aria-label="Filter by language"
        >
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

      <DataTable
        rows={visible}
        getKey={(student) => student.id}
        href={(student) => `/students/${student.id}`}
        columns={[
          {
            key: "name",
            header: "Student",
            // The only column with no width: names vary most, so it takes the slack.
            cell: (student) => (
              <span className="flex items-center gap-3 font-medium">
                <InitialsAvatar name={student.name} className="size-8" />
                <span className="truncate group-hover:underline">{student.name}</span>
              </span>
            ),
          },
          {
            key: "language",
            header: "Language",
            width: "17%",
            cell: (student) => <LanguageChip name={student.languageName} />,
          },
          {
            key: "level",
            header: "Level",
            width: "11%",
            interactive: true,
            cell: (student) => <LevelCell studentId={student.id} level={student.level} />,
          },
          {
            key: "teacher",
            header: "Teacher",
            width: "22%",
            cell: (student) =>
              student.teacherName ? (
                <span className="text-muted-foreground">{student.teacherName}</span>
              ) : (
                <span className="font-medium text-tone-amber-fg">Unassigned</span>
              ),
          },
          {
            key: "status",
            header: "Status",
            width: "16%",
            interactive: true,
            cell: (student) => (
              <StatusCell
                studentId={student.id}
                status={student.status}
                billing={student.billing}
              />
            ),
          },
        ]}
        card={(student) => (
          <>
            <InitialsAvatar name={student.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{student.name}</span>
              {/*
                The language keeps its coloured chip on a phone too. Flattening
                it to text here lost the one signal that lets a row be found by
                colour, which is the whole point of the language having one.
              */}
              <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                <LanguageChip name={student.languageName} />
                {student.level && <span className="tabular-nums">{student.level}</span>}
                <span className="truncate">
                  {student.teacherName ?? (
                    <span className="font-medium text-tone-amber-fg">Unassigned</span>
                  )}
                </span>
              </span>
            </span>
            <StatusBadge status={student.status} billing={student.billing} />
          </>
        )}
        empty={
          <EmptyState>
            {students.length === 0
              ? "No students yet. Create the first one to get started."
              : "No students match these filters. Try a different name, language or status."}
          </EmptyState>
        }
      />

      {visible.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {visible.length} of {students.length}{" "}
          {students.length === 1 ? "student" : "students"}
        </p>
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
        "shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium",
        "transition-colors motion-reduce:transition-none",
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
