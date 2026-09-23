"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export type TabPanel = {
  /** Stable key, also used to build the accessibility ids. */
  id: string;
  label: string;
  /** Optional figure beside the label — a count, never a decoration. */
  count?: number;
  content: React.ReactNode;
};

/**
 * Two or three views of the same subject, switched in place.
 *
 * Both panels are rendered on the server and only their visibility changes, so
 * switching is instant and neither view refetches. That is only reasonable
 * because these lists are small — a team of three looking at fifty students.
 *
 * Hidden panels use the `hidden` attribute rather than a display class: their
 * content stays out of the accessibility tree and out of find-in-page.
 */
export function TabSwitch({
  tabs,
  label,
  defaultTab,
  className,
}: {
  tabs: TabPanel[];
  /** What the group of tabs is for, e.g. "Payments view". */
  label: string;
  /** The tab to open on, e.g. when a link points at the second one. */
  defaultTab?: string;
  className?: string;
}) {
  const base = useId();
  const [active, setActive] = useState(
    tabs.some((tab) => tab.id === defaultTab) ? (defaultTab as string) : (tabs[0]?.id ?? "")
  );

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="mb-5 inline-flex gap-1 rounded-full border bg-card p-1 shadow-xs"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${base}-${tab.id}-tab`}
              aria-selected={isActive}
              aria-controls={`${base}-${tab.id}-panel`}
              onClick={() => setActive(tab.id)}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-sm font-medium",
                "transition-colors focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-ring motion-reduce:transition-none",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    isActive ? "bg-white/20" : "bg-muted"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-${tab.id}-panel`}
          aria-labelledby={`${base}-${tab.id}-tab`}
          hidden={tab.id !== active}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
