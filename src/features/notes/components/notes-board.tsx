"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { matchesSearch } from "@/lib/search";
import { NoteCard } from "./note-card";
import { NoteComposer } from "./note-composer";
import type { NoteView } from "../queries";

/**
 * A board of notes: pinned first, then the rest, urgent before the calm ones.
 *
 * The same component draws the private board and the team one — a team task is
 * a note that happens to be shared and pointed at somebody, so it edits exactly
 * like a note.
 *
 * Laid out in columns that each card flows down, so short and long notes pack
 * together instead of leaving a grid of holes beside every long checklist.
 */
export function NotesBoard({
  notes,
  archived,
  today,
  team = [],
  shared = false,
}: {
  notes: NoteView[];
  archived: boolean;
  today: string;
  /** The staff a task can be pointed at; only passed on the team board. */
  team?: { id: string; name: string }[];
  /** True on the team board, where a new note is a team task. */
  shared?: boolean;
}) {
  const [query, setQuery] = useState("");

  const visible = notes.filter((note) =>
    matchesSearch(query, [note.title, note.body, ...note.items.map((item) => item.text)])
  );
  const pinned = visible.filter((note) => note.pinned);
  const others = visible.filter((note) => !note.pinned);

  return (
    <div className="space-y-6">
      {!archived && <NoteComposer shared={shared} />}

      {notes.length > 3 && (
        <div className="relative mx-auto max-w-xl">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Search notes"
            aria-label="Search notes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="bg-card pl-9 shadow-xs"
          />
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState>
          {notes.length > 0
            ? "No notes match."
            : archived
              ? "Nothing archived."
              : shared
                ? "No team tasks yet."
                : "No notes yet."}
        </EmptyState>
      ) : (
        <>
          {pinned.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Pinned
              </h2>
              <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
                {pinned.map((note) => (
                  <NoteCard key={note.id} note={note} today={today} team={team} />
                ))}
              </div>
            </section>
          )}
          {others.length > 0 && (
            <section>
              {pinned.length > 0 && (
                <h2 className="mb-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Others
                </h2>
              )}
              <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
                {others.map((note) => (
                  <NoteCard key={note.id} note={note} today={today} team={team} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
