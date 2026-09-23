"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronRight, LogOut, Receipt, Settings, StickyNote, Wallet } from "lucide-react";
import wordmark from "../../../public/brand/darpe-wordmark.webp";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { InitialsAvatar } from "@/components/shared/identity";
import { logout } from "@/features/auth/actions";

/** What a phone reaches through the account menu instead of a tab of its own. */
const ACCOUNT_LINKS = [
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/payments", label: "Payments", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/**
 * The phone's top bar: DARPE's wordmark, and the signed-in person's avatar.
 *
 * The avatar is the door to everything the five tabs leave out — money,
 * settings, signing out. It is the pattern Gmail, Google Calendar and Notion
 * use on a phone for the same reason: a sixth tab for things used once a day
 * would squeeze the five that are used all day.
 *
 * The menu is a bottom sheet rather than a dropdown. On a phone the thumb is at
 * the bottom of the screen, and a list that rises from there is reachable one-
 * handed; a dropdown hanging off the top-right corner is not.
 */
export function MobileTopBar({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex shrink-0 items-center justify-between border-b bg-sidebar px-4 pt-[env(safe-area-inset-top)] lg:hidden">
      <Link href="/dashboard" aria-label="DARPE home" className="flex h-12 items-center">
        <Image src={wordmark} alt="" priority sizes="88px" className="h-auto w-22" />
      </Link>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger
          aria-label="Account and settings"
          className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <InitialsAvatar name={userName} className="size-8" />
        </DialogPrimitive.Trigger>

        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Popup className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-popover pb-[max(0.75rem,env(safe-area-inset-bottom))] text-popover-foreground ring-1 ring-foreground/10 outline-none duration-200 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom">
            <span aria-hidden="true" className="mx-auto mt-2 block h-1 w-10 rounded-full bg-border" />

            <div className="flex items-center gap-3 px-5 pt-4 pb-4">
              <InitialsAvatar name={userName} className="size-11 text-sm" />
              <div className="min-w-0">
                <DialogPrimitive.Title className="truncate text-base font-semibold">
                  {userName}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="truncate text-sm text-muted-foreground">
                  {userEmail}
                </DialogPrimitive.Description>
              </div>
            </div>

            <nav aria-label="Account" className="border-t px-2 py-2">
              {ACCOUNT_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-accent/40"
                >
                  <item.icon aria-hidden="true" className="size-4.5 text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </nav>

            <form action={logout} className="border-t px-2 pt-2">
              <button
                type="submit"
                className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut aria-hidden="true" className="size-4.5" />
                Sign out
              </button>
            </form>
          </DialogPrimitive.Popup>
        </DialogPortal>
      </DialogPrimitive.Root>
    </header>
  );
}
