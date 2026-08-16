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
import type { TeacherListRow } from "../queries";

/**
 * Active teachers are the working set, so they are the default view; inactive
 * ones remain reachable here because this list is the only place a teacher can
 * be found again and reactivated. Same client-side filtering as the students
 * list: the rows are already here, and names stay out of the URL.
 */
type ActiveFilter = "ACTIVE" | "INACTIVE" | "ALL";

const FILTER_OPTIONS: { value: ActiveFilter; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ALL", label: "All" },
];

export function TeachersTable({ teachers }: { teachers: TeacherListRow[] }) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ACTIVE");

  const visible = teachers.filter((teacher) => {
    const activeOk =
      activeFilter === "ALL" || (activeFilter === "ACTIVE") === teacher.active;

    return (
      activeOk && matchesSearch(query, [teacher.name, ...teacher.languageNames])
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="teacher-search">Search</Label>
          <Input
            id="teacher-search"
            type="search"
            placeholder="Name or language..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
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
            <SelectTrigger id="teacher-active-filter" className="w-full">
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
          {teachers.length === 0
            ? "No teachers yet. Create the first one to get started."
            : "No teachers match this search."}
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Languages</TableHead>
                <TableHead className="hidden md:table-cell">Students</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">
                    <Link href={`/teachers/${teacher.id}`} className="hover:underline">
                      {teacher.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {teacher.languageNames.map((name) => (
                        <Badge key={name} variant="secondary">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{teacher.studentCount}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {teacher.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={teacher.active ? "default" : "outline"}>
                      {teacher.active ? "Active" : "Inactive"}
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
