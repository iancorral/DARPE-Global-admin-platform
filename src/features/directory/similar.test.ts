import { describe, expect, it } from "vitest";
import { similarEntries, type DirectoryEntry } from "./similar";

/** Invented records, newest first, the order the directory queries return. */
const entries: DirectoryEntry[] = [
  { id: "1", name: "Ángel Soto", href: "/students/1", detail: "English · Active" },
  { id: "2", name: "Ana Beltrán", href: "/students/2", detail: "French · Active" },
  { id: "3", name: "Andrés Cruz", href: "/students/3", detail: "German · Archived" },
  { id: "4", name: "Ana Cruz", href: "/students/4", detail: "Italian · Active" },
  { id: "5", name: "Grupo II", href: "/groups/5", detail: "German · Teacher" },
];

const names = (result: DirectoryEntry[] | null) => result?.map((entry) => entry.name);

describe("similarEntries", () => {
  it("says nothing has been searched while nothing usable is typed", () => {
    expect(similarEntries("", entries)).toBeNull();
    expect(similarEntries("   ", entries)).toBeNull();
    expect(similarEntries("a", entries)).toBeNull();
  });

  it("matches the start of any word, ignoring accents", () => {
    expect(names(similarEntries("ang", entries))).toEqual(["Ángel Soto"]);
    expect(names(similarEntries("beltran", entries))).toEqual(["Ana Beltrán"]);
  });

  it("does not match the middle of a word", () => {
    expect(similarEntries("ngel", entries)).toEqual([]);
  });

  it("ranks a record matching more of the typed words first", () => {
    expect(names(similarEntries("ana cruz", entries))).toEqual([
      "Ana Cruz",
      "Ana Beltrán",
      "Andrés Cruz",
    ]);
  });

  it("keeps newest first among equally good matches", () => {
    expect(names(similarEntries("an", entries))).toEqual([
      "Ángel Soto",
      "Ana Beltrán",
      "Andrés Cruz",
      "Ana Cruz",
    ]);
  });

  it("surfaces existing groups while a new group's name is typed", () => {
    expect(names(similarEntries("grupo", entries))).toEqual(["Grupo II"]);
  });

  it("returns an empty list, not null, when a search finds nobody", () => {
    expect(similarEntries("zzz", entries)).toEqual([]);
  });

  it("stops at the limit", () => {
    expect(similarEntries("an", entries, 2)).toHaveLength(2);
  });
});
