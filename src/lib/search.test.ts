import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeForSearch } from "./search";

describe("normalizeForSearch", () => {
  it("lowercases", () => {
    expect(normalizeForSearch("MARIA")).toBe("maria");
  });

  it("strips accents", () => {
    expect(normalizeForSearch("Martínez Muñoz")).toBe("martinez munoz");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeForSearch("  ana  ")).toBe("ana");
  });
});

describe("matchesSearch", () => {
  const fields = ["María Martínez", "English", "B2"];

  it("matches regardless of accents in the data", () => {
    expect(matchesSearch("martinez", fields)).toBe(true);
  });

  it("matches regardless of accents in the query", () => {
    expect(matchesSearch("Martínez", ["Maria Martinez"])).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(matchesSearch("MARIA", fields)).toBe(true);
  });

  it("requires every word, across different fields", () => {
    expect(matchesSearch("maria english", fields)).toBe(true);
    expect(matchesSearch("maria french", fields)).toBe(false);
  });

  it("matches partial words", () => {
    expect(matchesSearch("mart", fields)).toBe(true);
  });

  it("treats an empty or blank query as no filter", () => {
    expect(matchesSearch("", fields)).toBe(true);
    expect(matchesSearch("   ", fields)).toBe(true);
  });

  it("ignores null fields", () => {
    expect(matchesSearch("ana", ["Ana", null])).toBe(true);
    expect(matchesSearch("ana", [null])).toBe(false);
  });

  it("does not match text absent from every field", () => {
    expect(matchesSearch("zzz", fields)).toBe(false);
  });
});
