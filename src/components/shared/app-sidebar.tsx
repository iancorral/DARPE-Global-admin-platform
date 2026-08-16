"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, GraduationCap, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/features/auth/components/logout-button";

/*
 * Grouped information architecture. Future groups — Money (Finance, Teacher
 * payouts) and Settings — are deliberately absent until a real route exists:
 * navigation never links to a page that is not there. The mobile bar keeps the
 * same destinations flattened, with Dashboard shortened to "Home"; a "More"
 * tab appears only once it has at least one real destination to hold.
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
      { href: "/teachers", label: "Teachers", icon: GraduationCap },
    ],
  },
];

const MOBILE_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export function AppSidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-60 shrink-0 overflow-y-auto border-r bg-sidebar p-4 lg:flex lg:flex-col">
        {/*
          A textual wordmark, not a logo: DARPE's official mark has not been
          supplied, and inventing one would be worse than setting the name well.
          No motif here — as a faint watermark behind the name it read as an
          accidental drawing rather than as brand texture.
        */}
        <div className="px-3 py-4">
          <p className="font-serif text-xl font-semibold tracking-[0.16em] text-primary">
            DARPE
          </p>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
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
