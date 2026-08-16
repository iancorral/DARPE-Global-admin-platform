import { describe, expect, it } from "vitest";
import { TONES, TONE_CLASSES, avatarTone, initialsOf, languageTone } from "./tone";

describe("languageTone", () => {
  it("gives each of DARPE's seven languages its own tone", () => {
    const tones = [
      languageTone({ name: "English" }),
      languageTone({ name: "Spanish" }),
      languageTone({ name: "French" }),
      languageTone({ name: "Italian" }),
      languageTone({ name: "Japanese" }),
      languageTone({ name: "German" }),
      languageTone({ name: "Swedish" }),
    ];

    expect(tones).toEqual(["violet", "teal", "blue", "amber", "rose", "cyan", "moss"]);
    // No two of the academy's languages may share a colour.
    expect(new Set(tones).size).toBe(7);
  });

  it("recognises the Swedish language by code and by either spelling", () => {
    expect(languageTone({ name: "Anything", code: "sv" })).toBe("moss");
    expect(languageTone({ name: "Sueco" })).toBe("moss");
    expect(languageTone({ name: "Svenska" })).toBe("moss");
  });

  it("keeps plum free to mean 'not one of ours'", () => {
    const academy = ["English", "Spanish", "French", "Italian", "Japanese", "German", "Swedish"];

    expect(academy.map((name) => languageTone({ name }))).not.toContain("plum");
  });

  it("ignores case and surrounding whitespace", () => {
    expect(languageTone({ name: "  ENGLISH " })).toBe("violet");
    expect(languageTone({ name: "spanish" })).toBe("teal");
  });

  it("accepts the Spanish spelling of a language", () => {
    expect(languageTone({ name: "Español" })).toBe("teal");
    expect(languageTone({ name: "Francés" })).toBe("blue");
  });

  it("prefers the stored code, so renaming a language keeps its colour", () => {
    expect(languageTone({ name: "English (business)", code: "en" })).toBe("violet");
    expect(languageTone({ name: "Anything", code: "DE" })).toBe("cyan");
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
