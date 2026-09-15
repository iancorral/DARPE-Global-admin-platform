"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import wordmark from "../../../public/brand/darpe-wordmark.webp";
import {
  LayoutDashboard,
  CalendarDays,
  GraduationCap,
  Receipt,
  Settings,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { MobileTopBar } from "./mobile-top-bar";

/*
 * Grouped information architecture. Every entry points at a route that exists —
 * navigation never links to a page that is not there.
 */
type NavItem = {
  href: string;
  label: string;
  /** Shorter name for the mobile bar, when the desktop label is too long. */
  mobileLabel?: string;
  icon: typeof LayoutDashboard;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/students", label: "Students", icon: Users },
      { href: "/groups", label: "Groups", icon: UsersRound },
      { href: "/teachers", label: "Teachers", icon: GraduationCap },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/finance", label: "Finance", icon: Wallet },
      { href: "/payments", label: "Payments", icon: Receipt },
    ],
  },
  {
    label: "Workspace",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

/*
 * The phone bar keeps only what is used on the move. Money and settings are
 * reached from the avatar in `MobileTopBar` instead of spending a tab each.
 */
const DESK_ONLY_GROUPS = new Set(["Money", "Workspace"]);

const MOBILE_ITEMS = NAV_GROUPS.filter(
  (group) => !DESK_ONLY_GROUPS.has(group.label)
).flatMap((group) => group.items);

export function AppSidebar({
  userName,
  userRole,
  userEmail,
}: {
  userName: string;
  userRole: string;
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <>
      <MobileTopBar userName={userName} userEmail={userEmail} />
      <aside className="hidden w-60 shrink-0 overflow-y-auto border-r bg-sidebar p-4 lg:flex lg:flex-col">
        {/*
          DARPE's own wordmark, cut out of its supplied backdrop so it sits on
          the sidebar rather than on a near-white rectangle of its own. The
          letters are the brand's — the geometric open forms are distinctive
          and no font substitutes for them, which is why this is an image and
          not type. Alt text names the product, so the sidebar still announces
          itself to a screen reader.
        */}
        <div className="px-3 py-4">
          <Image
            src={wordmark}
            alt="DARPE"
            priority
            sizes="148px"
            className="h-auto w-[148px]"
          />
          <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Global admin
          </p>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        // The active marker is a thin brand rule at the left edge,
                        // not a filled pill: quieter, and unmistakably a place.
                        "flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "border-primary bg-accent/40 font-medium text-primary"
                          : "border-transparent text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                      )}
                    >
                      <item.icon className="size-4" strokeWidth={isActive ? 2.2 : 1.8} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t px-3 pt-4">
          <div>
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{userRole}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Padded for the device's home indicator, so the last row is never under it. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden">
        {MOBILE_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 flex-1 flex-col items-center gap-1 py-2 text-xs",
                isActive ? "font-medium text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="size-4" strokeWidth={isActive ? 2.2 : 1.8} />
              {item.mobileLabel ?? item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
