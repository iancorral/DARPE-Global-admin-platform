"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import wordmark from "../../../public/brand/darpe-wordmark.webp";
import globe from "../../../public/brand/darpe-icon-192.png";
import {
  LayoutDashboard,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
  Receipt,
  Settings,
  StickyNote,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { InitialsAvatar } from "./identity";
import { MobileTopBar } from "./mobile-top-bar";
import { SIDEBAR_COLLAPSED, SIDEBAR_COOKIE, SIDEBAR_COOKIE_MAX_AGE } from "./sidebar-state";

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
    items: [
      { href: "/notes", label: "Notes", icon: StickyNote },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
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
  initialCollapsed = false,
}: {
  userName: string;
  userRole: string;
  userEmail: string;
  /** Read from the cookie on the server, so the first paint is already right. */
  initialCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? SIDEBAR_COLLAPSED : "open"}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
  }

  return (
    <>
      <MobileTopBar userName={userName} userEmail={userEmail} />
      {/*
        Folds to an icon rail, mainly to give the calendar's seven columns the
        room. Folded, every entry keeps its name as a tooltip and for screen
        readers.
      */}
      <aside
        className={cn(
          "hidden shrink-0 overflow-x-hidden overflow-y-auto border-r bg-sidebar py-4 transition-[width] duration-200 motion-reduce:transition-none lg:flex lg:flex-col",
          collapsed ? "w-17 px-2" : "w-60 px-4"
        )}
      >
        {/*
          The brand has the top of the sidebar to itself. A button beside the
          wordmark crowded it towards the edge, and one floating on the border
          looked like nothing else in the app — so the toggle is the last row
          of the menu instead.
        */}
        <div className={cn("flex py-4", collapsed ? "justify-center" : "px-3")}>
          {collapsed ? (
            <Image src={globe} alt="DARPE" priority sizes="32px" className="size-8" />
          ) : (
            /*
              DARPE's own wordmark, cut out of its supplied backdrop so it sits
              on the sidebar rather than on a near-white rectangle of its own.
              The letters are the brand's — no font substitutes for them, which
              is why this is an image and not type.

              `inline-flex` makes the block exactly as wide as the wordmark, so
              "Global admin" centres under the letters rather than under the
              whole sidebar. The left padding equal to the letter-spacing
              cancels the gap tracking leaves after the last letter, which
              otherwise pulls a centred line visibly to the left.
            */
            <div className="inline-flex flex-col items-center">
              <Image
                src={wordmark}
                alt="DARPE"
                priority
                sizes="148px"
                className="h-auto w-37"
              />
              <p className="mt-1 pl-[0.28em] text-[10px] tracking-[0.28em] text-muted-foreground uppercase">
                Global admin
              </p>
            </div>
          )}
        </div>

        <nav className={cn("mt-4 flex flex-1 flex-col", collapsed ? "gap-3" : "gap-6")}>
          {NAV_GROUPS.map((group, index) => (
            <div key={group.label}>
              {collapsed ? (
                // Folded, the group names become a hairline between groups.
                index > 0 && <div aria-hidden="true" className="mx-2 mb-3 h-px bg-border" />
              ) : (
                <p className="px-3 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground/80 uppercase">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        // The active marker is a thin brand rule at the left edge,
                        // not a filled pill: quieter, and unmistakably a place.
                        "flex items-center border-l-2 py-2 text-sm transition-colors",
                        collapsed ? "justify-center px-0" : "gap-3 px-3",
                        isActive
                          ? "border-primary bg-accent/40 font-medium text-primary"
                          : "border-transparent text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                      )}
                    >
                      <item.icon className="size-4 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                      <span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/*
          Styled exactly like a menu entry, so it reads as part of the menu —
          the "Collapse sidebar" row GitLab and the Azure portal keep at the
          foot of theirs. Folded, only the chevron stays, in the icon column.
        */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : undefined}
          className={cn(
            "mt-4 mb-3 flex items-center border-l-2 border-transparent py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none",
            collapsed ? "justify-center px-0" : "gap-3 px-3"
          )}
        >
          {collapsed ? (
            <ChevronsRight className="size-4 shrink-0" strokeWidth={1.8} />
          ) : (
            <ChevronsLeft className="size-4 shrink-0" strokeWidth={1.8} />
          )}
          <span className={collapsed ? "sr-only" : undefined}>
            {collapsed ? "Expand sidebar" : "Collapse"}
          </span>
        </button>

        {collapsed ? (
          <div className="flex flex-col items-center gap-2 border-t pt-4">
            <span title={`${userName} · ${userRole}`}>
              <InitialsAvatar name={userName} />
            </span>
            <LogoutButton compact />
          </div>
        ) : (
          <div className="space-y-2 border-t px-3 pt-4">
            <div>
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userRole}</p>
            </div>
            <LogoutButton />
          </div>
        )}
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
