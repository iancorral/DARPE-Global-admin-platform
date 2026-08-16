"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="student-search">Search</Label>
          <Input
            id="student-search"
            type="search"
            placeholder="Name, language, teacher..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="space-y-2 sm:w-48">
          <Label htmlFor="student-status-filter">Status</Label>
          <Select
            items={FILTER_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            value={statusFilter}
            onValueChange={(value) => value !== null && setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger id="student-status-filter" className="w-full">
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
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {students.length === 0
            ? "No students yet. Create the first one to get started."
            : "No students match this search."}
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Language</TableHead>
                <TableHead className="hidden md:table-cell">Teacher</TableHead>
                <TableHead className="hidden lg:table-cell">Level</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    <Link href={`/students/${student.id}`} className="hover:underline">
                      {student.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{student.languageName}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {student.teacherName ?? "Unassigned"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{student.level ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[student.status]}>
                      {STUDENT_STATUS_LABELS[student.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
