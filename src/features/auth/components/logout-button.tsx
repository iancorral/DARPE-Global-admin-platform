"use client";

import { LogOut } from "lucide-react";
import { logout } from "../actions";

/** `compact` draws the icon alone, for the folded sidebar. */
export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        aria-label={compact ? "Sign out" : undefined}
        title={compact ? "Sign out" : undefined}
        className={
          compact
            ? "inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/30 hover:text-foreground"
            : "flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        }
      >
        <LogOut className={compact ? "size-4" : "size-3"} />
        {!compact && "Sign out"}
      </button>
    </form>
  );
}