"use client";

import { InlineText } from "@/components/shared/inline-field";
import { MODALITIES } from "@/features/students/schemas";
import { planLabel, type CoursePrice } from "@/features/finance/pricing";
import type { Modality } from "@/generated/prisma/client";
import { updateCoursePrice } from "../actions";

/** 299900 → "2,999": the figure alone, since the column says the currency. */
function units(cents: number): string {
  return Math.round(cents / 100).toLocaleString("en-US");
}

/**
 * The list price of each course, edited where it is read.
 *
 * Four rows, two figures each, and no Save button: click a price, type the new
 * one, press Enter. Each write goes through the same money parser as a payment
 * and lands on `CoursePrice`, which the payments screen reads next render.
 *
 * No explanation on the screen. Staff already know that a new price leaves
 * recorded payments and existing students' rates alone; saying so in a
 * paragraph under the table only put words between them and the numbers.
 */
export function CoursePricesPanel({ prices }: { prices: Record<Modality, CoursePrice> }) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem] gap-x-3 border-b bg-muted/40 px-4 py-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          <span>Course</span>
          <span className="text-right">MXN</span>
          <span className="text-right">USD</span>
        </div>

        <ul className="divide-y">
          {MODALITIES.map((modality) => {
            const price = prices[modality];

            return (
              <li
                key={modality}
                className="grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem] items-center gap-x-3 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{price.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {price.perHour ? "Priced per hour" : planLabel(modality)}
                  </p>
                </div>

                <InlineText
                  value={units(price.mxnCents)}
                  label={`${price.label} price in pesos`}
                  className="justify-end text-right text-sm font-medium tabular-nums"
                  save={(next) =>
                    updateCoursePrice({ modality, mxn: next, usd: units(price.usdCents) })
                  }
                />
                <InlineText
                  value={units(price.usdCents)}
                  label={`${price.label} price in dollars`}
                  className="justify-end text-right text-sm font-medium tabular-nums"
                  save={(next) =>
                    updateCoursePrice({ modality, mxn: units(price.mxnCents), usd: next })
                  }
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
