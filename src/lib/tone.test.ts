import { describe, expect, it } from "vitest";
import { TONES, TONE_CLASSES, avatarTone, initialsOf, languageTone } from "./tone";

/** Every language DARPE teaches, in English and in Spanish. */
const ACADEMY = [
  ["English", "Inglés"],
  ["Spanish", "Español"],
  ["French", "Francés"],
  ["Italian", "Italiano"],
  ["German", "Alemán"],
  ["Japanese", "Japonés"],
  ["Chinese", "Chino"],
  ["Korean", "Coreano"],
  ["Swedish", "Sueco"],
] as const;

describe("languageTone", () => {
  /*
   * These assert the rules rather than the palette. Which colour Spanish gets
   * is a design decision that may change; that no two languages share one, and
   * that none of them takes DARPE's own violet, are what the feature depends
   * on — those are worth failing a build over.
   */
  it("gives each of DARPE's nine languages its own tone", () => {
    const tones = ACADEMY.map(([name]) => languageTone({ name }));

    expect(new Set(tones).size).toBe(ACADEMY.length);
  });

  it("keeps plum free to mean 'not one of ours'", () => {
    expect(ACADEMY.map(([name]) => languageTone({ name }))).not.toContain("plum");
    expect(languageTone({ name: "Portuguese" })).toBe("plum");
  });

  it("leaves violet to the brand, so no language competes with the interface", () => {
    expect(ACADEMY.map(([name]) => languageTone({ name }))).not.toContain("violet");
  });

  it("gives a language the same tone in either spelling", () => {
    for (const [english, spanish] of ACADEMY) {
      expect(languageTone({ name: spanish })).toBe(languageTone({ name: english }));
    }
  });

  it("takes its cue from the flag where two languages would not collide", () => {
    // Spanish gold, Japanese crimson, Italian green: the documented anchors.
    expect(languageTone({ name: "Spanish" })).toBe("amber");
    expect(languageTone({ name: "Japanese" })).toBe("rose");
    expect(languageTone({ name: "Italian" })).toBe("moss");
  });

  it("recognises a language by code and by either spelling", () => {
    expect(languageTone({ name: "Anything", code: "sv" })).toBe("cyan");
    expect(languageTone({ name: "Sueco" })).toBe("cyan");
    expect(languageTone({ name: "Svenska" })).toBe("cyan");
  });

  it("ignores case and surrounding whitespace", () => {
    expect(languageTone({ name: "  ENGLISH " })).toBe(languageTone({ name: "English" }));
    expect(languageTone({ name: "spanish" })).toBe("amber");
  });

  it("prefers the stored code, so renaming a language keeps its colour", () => {
    expect(languageTone({ name: "English (business)", code: "en" })).toBe(
      languageTone({ name: "English" })
    );
    expect(languageTone({ name: "Anything", code: "DE" })).toBe("slate");
  });

  it("falls back to the name when the code is unknown or absent", () => {
    expect(languageTone({ name: "French", code: "zz" })).toBe("blue");
    expect(languageTone({ name: "French", code: null })).toBe("blue");
    expect(languageTone({ name: "French", code: "" })).toBe("blue");
  });

  it("gives anything unrecognised the neutral plum tone", () => {
    expect(languageTone({ name: "Portuguese" })).toBe("plum");
    expect(languageTone({ name: "" })).toBe("plum");
  });

  it("is deterministic", () => {
    expect(languageTone({ name: "Italian" })).toBe(languageTone({ name: "Italian" }));
  });
});

describe("avatarTone", () => {
  it("returns the same tone for the same person every time", () => {
    expect(avatarTone("Ana Beltran")).toBe(avatarTone("Ana Beltran"));
  });

  it("ignores case and accents, so one person keeps one colour", () => {
    expect(avatarTone("María Martínez")).toBe(avatarTone("maria martinez"));
  });

  it("only ever returns a defined tone", () => {
    for (const name of ["A", "Zoe", "Ana Beltran", "", "Lukas Weber", "Kenji Tanaka"]) {
      expect(TONES).toContain(avatarTone(name));
    }
  });

  it("spreads different people across more than one tone", () => {
    const names = ["Ana Beltran", "Kenji Tanaka", "Lukas Weber", "Sofia Mendez", "Marco Diaz"];
    const used = new Set(names.map(avatarTone));

    expect(used.size).toBeGreaterThan(1);
  });
});

describe("initialsOf", () => {
  it("takes the first and last word", () => {
    expect(initialsOf("Ana Beltran")).toBe("AB");
    expect(initialsOf("María de la Cruz")).toBe("MC");
  });

  it("handles a single word", () => {
    expect(initialsOf("Ana")).toBe("A");
  });

  it("uppercases and tolerates loose spacing", () => {
    expect(initialsOf("  ana   beltran  ")).toBe("AB");
  });

  it("returns nothing for an empty name", () => {
    expect(initialsOf("")).toBe("");
    expect(initialsOf("   ")).toBe("");
  });
});

describe("TONE_CLASSES", () => {
  it("covers every tone", () => {
    for (const tone of TONES) {
      expect(TONE_CLASSES[tone].chip).toContain(tone);
      expect(TONE_CLASSES[tone].dot).toContain(tone);
    }
  });
});
