"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageChip } from "@/components/shared/identity";
import { cn } from "@/lib/utils";
import { createLanguage, updateLanguage } from "../actions";
import type { LanguageRow } from "../queries";

/**
 * The languages DARPE offers.
 *
 * Everything here is backed by the `Language` table, which already exists — no
 * schema change was needed to make this real. A language is never deleted:
 * students, classes and teachers point at it, so the only lever is active,
 * which controls whether it appears in the forms that offer a choice.
 */
export function LanguagesPanel({ languages }: { languages: LanguageRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function toggleActive(language: LanguageRow) {
    setPendingId(language.id);
    try {
      const result = await updateLanguage({
        id: language.id,
        name: language.name,
        active: !language.active,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        language.active
          ? `${language.name} will no longer be offered`
          : `${language.name} is offered again`
      );
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function handleAdd() {
    setIsSaving(true);
    try {
      const result = await createLanguage({ name, code });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`${name.trim()} added`);
      setName("");
      setCode("");
      setIsAdding(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
        {languages.map((language) => {
          const inUse = language.studentCount > 0 || language.teacherCount > 0;

          return (
            <li
              key={language.id}
              className={cn(
                "flex flex-wrap items-center gap-3 px-4 py-3",
                !language.active && "opacity-70"
              )}
            >
              <LanguageChip name={language.name} code={language.code} />

              <span className="text-xs text-muted-foreground uppercase">{language.code}</span>

              <span className="flex-1 text-xs text-muted-foreground">
                {inUse
                  ? `${language.studentCount} ${
                      language.studentCount === 1 ? "student" : "students"
                    } · ${language.teacherCount} ${
                      language.teacherCount === 1 ? "teacher" : "teachers"
                    }`
                  : "Nobody studies or teaches it yet"}
              </span>

              <Badge variant={language.active ? "default" : "outline"}>
                {language.active ? "Offered" : "Not offered"}
              </Badge>

              <Button
                size="sm"
                variant="outline"
                disabled={pendingId === language.id}
                onClick={() => toggleActive(language)}
              >
                {pendingId === language.id
                  ? "Saving..."
                  : language.active
                    ? "Stop offering"
                    : "Offer again"}
              </Button>
            </li>
          );
        })}
      </ul>

      {isAdding ? (
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-xs">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="language-name">Name</Label>
              <Input
                id="language-name"
                value={name}
                placeholder="Portuguese"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language-code">Code</Label>
              <Input
                id="language-code"
                value={code}
                placeholder="pt"
                maxLength={5}
                onChange={(event) => setCode(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A short code such as pt. It can&apos;t be changed later.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleAdd} disabled={isSaving}>
              {isSaving ? "Saving..." : "Add language"}
            </Button>
            <Button variant="outline" onClick={() => setIsAdding(false)} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setIsAdding(true)}>
          <Plus className="size-4" /> Add language
        </Button>
      )}
    </div>
  );
}
