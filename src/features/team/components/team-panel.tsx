"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, RefreshCw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InitialsAvatar } from "@/components/shared/identity";
import { TONE_CLASSES } from "@/lib/tone";
import { addTeamMember, resetTeamMemberPassword } from "../actions";
import { generateTemporaryPassword } from "../password";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "../roles";
import type { TeamMember } from "../queries";

type Shared = { name: string; email: string; password: string };

/**
 * Who has an account, and the two things a manager does with them.
 *
 * Adding a person creates their account with a temporary password; resetting
 * gives an existing person a new one. Either way the details are shown once,
 * with a button that copies them ready to send — the password is not stored
 * anywhere the app can show it again.
 */
export function TeamPanel({
  members,
  currentUserId,
  configured,
}: {
  members: TeamMember[];
  currentUserId: string;
  configured: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [shared, setShared] = useState<Shared | null>(null);

  return (
    <div className="space-y-4">
      <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
        {members.map((member) => (
          <li key={member.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <InitialsAvatar name={member.name} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.name}
                  {member.id === currentUserId && (
                    <span className="font-normal text-muted-foreground"> · you</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
              {!member.hasOwnPassword && (
                <Badge variant="outline" className={TONE_CLASSES.amber.chip}>
                  Temporary password
                </Badge>
              )}
              <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
              {configured && member.id !== currentUserId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShared(null);
                    setResettingId(resettingId === member.id ? null : member.id);
                  }}
                >
                  <KeyRound className="size-4" /> Reset password
                </Button>
              )}
            </div>

            {resettingId === member.id && (
              <ResetPassword
                member={member}
                onDone={(password) => {
                  setResettingId(null);
                  setShared({ name: member.name, email: member.email, password });
                }}
              />
            )}
          </li>
        ))}
      </ul>

      {shared && <SharedDetails details={shared} onClose={() => setShared(null)} />}

      {!configured ? (
        <p className="text-xs text-muted-foreground">
          To add people and reset passwords, set SUPABASE_SECRET_KEY on the server.
        </p>
      ) : adding ? (
        <AddMember
          onCancel={() => setAdding(false)}
          onDone={(details) => {
            setAdding(false);
            setShared(details);
          }}
        />
      ) : (
        <Button
          variant="outline"
          onClick={() => {
            setShared(null);
            setAdding(true);
          }}
        >
          <UserPlus className="size-4" /> Add person
        </Button>
      )}
    </div>
  );
}

function PasswordField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="font-mono"
        autoComplete="off"
        spellCheck={false}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Generate a new password"
        onClick={() => onChange(generateTemporaryPassword())}
      >
        <RefreshCw className="size-4" />
      </Button>
    </div>
  );
}

function AddMember({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: (details: Shared) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ASSIGNABLE_ROLES)[number]>("STAFF");
  const [password, setPassword] = useState(generateTemporaryPassword);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await addTeamMember({ name, email, role, temporaryPassword: password });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`${name.trim()} can sign in now`);
      onDone({ name: name.trim(), email: email.trim().toLowerCase(), password });
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="member-name">Name</Label>
          <Input id="member-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="member-email">Email</Label>
          <Input
            id="member-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="member-role">Role</Label>
          <Select
            items={ASSIGNABLE_ROLES.map((value) => ({ label: ROLE_LABELS[value], value }))}
            value={role}
            onValueChange={(value) =>
              value !== null && setRole(value as (typeof ASSIGNABLE_ROLES)[number])
            }
          >
            <SelectTrigger id="member-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map((value) => (
                <SelectItem key={value} value={value}>
                  {ROLE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Admins can also add people and reset passwords.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="member-password">Temporary password</Label>
          <PasswordField id="member-password" value={password} onChange={setPassword} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={isSaving || !name.trim() || !email.trim()}>
          {isSaving ? "Creating..." : "Create account"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ResetPassword({
  member,
  onDone,
}: {
  member: TeamMember;
  onDone: (password: string) => void;
}) {
  const router = useRouter();
  const [password, setPassword] = useState(generateTemporaryPassword);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await resetTeamMemberPassword({
        profileId: member.id,
        temporaryPassword: password,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`New password set for ${member.name}`);
      onDone(password);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-3">
      <div className="min-w-60 flex-1 space-y-2">
        <Label htmlFor={`reset-${member.id}`}>New temporary password</Label>
        <PasswordField id={`reset-${member.id}`} value={password} onChange={setPassword} />
      </div>
      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving..." : "Set password"}
      </Button>
    </div>
  );
}

/** Shown once, straight after creating or resetting — the only time it can be. */
function SharedDetails({ details, onClose }: { details: Shared; onClose: () => void }) {
  const text = [
    "DARPE Admin",
    `${window.location.origin}/login`,
    `Email: ${details.email}`,
    `Temporary password: ${details.password}`,
  ].join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied — ready to send");
    } catch {
      toast.error("Copy failed. Select the details and copy them by hand.");
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-tone-teal-line bg-tone-teal p-4">
      <p className="text-sm font-medium text-tone-teal-fg">Send these to {details.name}</p>
      <pre className="overflow-x-auto rounded-lg bg-card p-3 font-mono text-xs">{text}</pre>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={copy}>
          <Copy className="size-4" /> Copy
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
