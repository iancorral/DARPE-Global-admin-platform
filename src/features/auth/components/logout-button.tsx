"use client";

import { LogOut } from "lucide-react";
import { logout } from "../actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <LogOut className="size-3" />
        Sign out
      </button>
    </form>
  );
}