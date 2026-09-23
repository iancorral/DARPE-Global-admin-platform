"use client";

import { Clock, UserRound, UsersRound, Zap, type LucideIcon } from "lucide-react";
import { InlineText } from "@/components/shared/inline-field";
import { MODALITIES } from "@/features/students/schemas";
import { planLabel, type CoursePrice } from "@/features/finance/pricing";
import type { Modality } from "@/generated/prisma/client";
import { TONE_CLASSES, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { updateCoursePrice } from "../actions";

/** 299900 → "2,999": the figure alone, since the label beside it says the currency. */
function units(cents: number): string {
  return Math.round(cents / 100).toLocaleString("en-US");
}

/** Each course's mark: what it is at a glance, in a tone of its own. */
const COURSE_LOOK: Record<Modality, { icon: LucideIcon; tone: Tone }> = {
  ADVISORY: { icon: Clock, tone: "amber" },
  GROUP_EXTENSIVE: { icon: UsersRound, tone: "teal" },
  INDIVIDUAL_EXTENSIVE: { icon: UserRound, tone: "violet" },
  INDIVIDUAL_INTENSIVE: { icon: Zap, tone: "rose" },
};

/**
 * The list price of each course, edited where it is read.
 *
 * One tile per course, the way pricing pages lay out plans (Stripe, Notion,
 * Duolingo): the peso price is the headline in the serif DARPE uses for key
 * figures, the dollar price sits under it, and both are the fields themselves
 * — click a figure, type, press Enter. No Save button, and each write goes
 * through the same money parser as a payment into `CoursePrice`.
 *
 * No explanation on the screen. Staff already know that a new price leaves
 * recorded payments and existing students' rates alone.
 */
export function CoursePricesPanel({ prices }: { prices: Record<Modality, CoursePrice> }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {MODALITIES.map((modality) => {
        const price = prices[modality];
        const { icon: Icon, tone } = COURSE_LOOK[modality];
        const toneClasses = TONE_CLASSES[tone];
        const per = price.perHour ? "hour" : "month";

        return (
          <li
            key={modality}
            className="relative flex flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-xs"
          >
            <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-1", toneClasses.bar)} />

            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
                  toneClasses.avatar
                )}
              >
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{price.label}</p>
                <p className="text-xs text-muted-foreground">
                  {price.perHour ? "One class" : planLabel(modality)}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-serif text-2xl font-semibold text-muted-foreground">$</span>
              <div className="min-w-0 flex-1">
                <InlineText
                  value={units(price.mxnCents)}
                  label={`${price.label} price in pesos`}
                  className="font-serif text-3xl leading-none font-semibold tabular-nums"
                  save={(next) =>
                    updateCoursePrice({ modality, mxn: next, usd: units(price.usdCents) })
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">MXN per {per}</p>

            <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
              <span className="text-xs text-muted-foreground">In dollars</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-sm text-muted-foreground">$</span>
                <InlineText
                  value={units(price.usdCents)}
                  label={`${price.label} price in dollars`}
                  className="mx-0 w-auto px-1 text-sm font-semibold tabular-nums"
                  save={(next) =>
                    updateCoursePrice({ modality, mxn: units(price.mxnCents), usd: next })
                  }
                />
                <span className="text-xs text-muted-foreground">USD</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
