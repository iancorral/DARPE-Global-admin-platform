"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { InitialsAvatar } from "@/components/shared/identity";
import { cn } from "@/lib/utils";
import { DIRECTORY_LIMIT, similarEntries, type DirectoryEntry } from "../similar";

type Noun = { singular: string; plural: string };

/**
 * Records that already exist, beside the form creating a new one.
 *
 * With nothing typed it lists the most recently added, which is useful context
 * on its own. As a name is typed it narrows to the records whose names look
 * alike, so a duplicate is noticed before it is saved rather than found in the
 * list afterwards. Each opens in a new tab: following one must not throw away
 * the half-filled form.
 */
export function SimilarRecords({
  query,
  entries,
  noun,
  className,
}: {
  query: string;
  entries: DirectoryEntry[];
  noun: Noun;
  className?: string;
}) {
  const matches = similarEntries(query, entries);
  const shown = matches ?? entries.slice(0, DIRECTORY_LIMIT);

  return (
    <section className={cn("rounded-xl border bg-card p-4 shadow-xs", className)}>
      <h3 className="text-sm font-semibold">
        {matches === null ? `Recently added ${noun.plural}` : `Similar ${noun.plural}`}
      </h3>

      {shown.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {matches === null
            ? `No ${noun.plural} yet.`
            : `No ${noun.singular} with a similar name.`}
        </p>
      ) : (
        <ul className="mt-3 space-y-0.5">
          {shown.map((entry) => (
            <li key={entry.id}>
              <Link
                href={entry.href}
                target="_blank"
                rel="noopener"
                className="group -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/40 motion-reduce:transition-none"
              >
                <InitialsAvatar name={entry.name} className="size-7 text-[11px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{entry.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {entry.detail}
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The same check as one line under the name field, for a phone.
 *
 * On a narrow screen the side panel drops below the whole form, out of sight
 * while the name is being typed, so the matches are repeated right where the
 * typing happens. Renders nothing until there is a match: an empty line under
 * every name field would only push the form down.
 */
export function SimilarRecordsInline({
  query,
  entries,
  className,
}: {
  query: string;
  entries: DirectoryEntry[];
  className?: string;
}) {
  const matches = similarEntries(query, entries, 3);
  if (!matches || matches.length === 0) return null;

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Already on record:{" "}
      {matches.map((entry, index) => (
        <Fragment key={entry.id}>
          {index > 0 && ", "}
          <Link
            href={entry.href}
            target="_blank"
            rel="noopener"
            className="font-medium text-foreground underline underline-offset-2"
          >
            {entry.name}
          </Link>
        </Fragment>
      ))}
    </p>
  );
}
