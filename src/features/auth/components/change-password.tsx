"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "../actions";
import { MIN_PASSWORD_LENGTH } from "../schemas";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

/**
 * Setting your own password.
 *
 * The one form in the product that is about the person using it rather than
 * about DARPE's records, which is why it asks for the current password: staff
 * share desks and stay signed in, and without that check anyone passing a
 * logged-in screen could lock the owner out of their own account.
 *
 * Every field is cleared on success — a password left sitting in an input is a
 * password on screen.
 */
export function ChangePassword({ hasOwnPassword }: { hasOwnPassword: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit =
    form.currentPassword.length > 0 &&
    form.newPassword.length >= MIN_PASSWORD_LENGTH &&
    form.confirmPassword.length > 0;

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await changePassword(form);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setForm(EMPTY);
      toast.success("Password updated");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
      {!hasOwnPassword && (
        <p className="rounded-lg border border-tone-amber-line bg-tone-amber px-3 py-2 text-xs text-tone-amber-fg">
          You&apos;re using a temporary password. Choose a new one to keep your account secure.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(event) =>
              setForm({ ...form, currentPassword: event.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Repeat new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm({ ...form, confirmPassword: event.target.value })
            }
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Use at least {MIN_PASSWORD_LENGTH} characters.
      </p>

      <Button onClick={handleSave} disabled={isSaving || !canSubmit}>
        {isSaving ? "Saving..." : "Change password"}
      </Button>
    </div>
  );
}
