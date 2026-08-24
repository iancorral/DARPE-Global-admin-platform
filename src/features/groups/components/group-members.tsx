"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { InitialsAvatar } from "@/components/shared/identity";
import { STUDENT_STATUS_LABELS } from "@/features/students/schemas";
import { addGroupMember, removeGroupMember } from "../actions";
import type { GroupDetail } from "../queries";

/**
 * Who is in the group.
 *
 * Removing asks for a second click on the same row, the inline confirmation
 * used everywhere else in the product. It never touches classes that already
 * happened: a student who leaves stays on the classes they attended.
 */
export function GroupMembers({
  groupId,
  members,
  candidates,
  languageName,
}: {
  groupId: string;
  members: GroupDetail["members"];
  candidates: GroupDetail["candidates"];
  languageName: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!selected) return;

    setIsAdding(true);
    try {
      const result = await addGroupMember({ groupId, studentId: selected });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Student added to the group");
      setSelected("");
      router.refresh();
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(studentId: string) {
    setRemovingId(studentId);
    try {
      const result = await removeGroupMember({ groupId, studentId });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Student removed from the group");
      router.refresh();
    } finally {
      setRemovingId(null);
      setConfirmingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <EmptyState>
          No students in this group yet. Add one below — a group needs at least one member
          before it can have a schedule.
        </EmptyState>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
          {members.map((member) => (
            <li key={member.studentId} className="flex items-center gap-3 px-4 py-3">
              <InitialsAvatar name={member.name} />
              <span className="min-w-0 flex-1">
                <Link
                  href={`/students/${member.studentId}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {member.name}
                </Link>
                {member.level && (
                  <span className="text-xs text-muted-foreground">{member.level}</span>
                )}
              </span>

              <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"}>
                {STUDENT_STATUS_LABELS[member.status]}
              </Badge>

              {confirmingId === member.studentId ? (
                <span className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={removingId === member.studentId}
                    onClick={() => handleRemove(member.studentId)}
                  >
                    {removingId === member.studentId ? "Removing..." : "Remove"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                    Keep
                  </Button>
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${member.name} from the group`}
                  onClick={() => setConfirmingId(member.studentId)}
                >
                  <X className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="add-member">Add a student</Label>
          {candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No one else studies {languageName} and is active or on trial. A student has
              to study the group&apos;s language to join it.
            </p>
          ) : (
            <Select
              items={candidates.map((student) => ({
                label: student.level ? `${student.name} · ${student.level}` : student.name,
                value: student.id,
              }))}
              value={selected}
              onValueChange={(value) => value !== null && setSelected(value)}
            >
              <SelectTrigger id="add-member" className="w-full">
                <SelectValue placeholder={`Students who study ${languageName}`} />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                    {student.level ? ` · ${student.level}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {candidates.length > 0 && (
          <Button onClick={handleAdd} disabled={!selected || isAdding}>
            <Plus className="size-4" /> {isAdding ? "Adding..." : "Add"}
          </Button>
        )}
      </div>
    </div>
  );
}
