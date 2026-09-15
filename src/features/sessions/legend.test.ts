import { describe, expect, it } from "vitest";
import { languageTone } from "@/lib/tone";
import { visibleLanguageLegend } from "./legend";

describe("visibleLanguageLegend", () => {
  it("lists each language once, with its tone", () => {
    expect(
      visibleLanguageLegend([
        { languageName: "English" },
        { languageName: "English" },
        { languageName: "Spanish" },
      ])
    ).toEqual([
      // The tones themselves are `languageTone`'s to decide; what this asserts
      // is that the legend agrees with it and lists each language once.
      { name: "English", tone: languageTone({ name: "English" }) },
      { name: "Spanish", tone: languageTone({ name: "Spanish" }) },
    ]);
  });

  it("sorts by name so the order is stable as classes move", () => {
    const entries = visibleLanguageLegend([
      { languageName: "Japanese" },
      { languageName: "French" },
      { languageName: "German" },
    ]);

    expect(entries.map((entry) => entry.name)).toEqual(["French", "German", "Japanese"]);
  });

  it("is empty for a week with no classes, so no legend is drawn", () => {
    expect(visibleLanguageLegend([])).toEqual([]);
  });

  it("never invents a language the week does not contain", () => {
    const entries = visibleLanguageLegend([{ languageName: "Italian" }]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ name: "Italian", tone: languageTone({ name: "Italian" }) });
  });

  it("gives an unrecognised language the neutral tone rather than dropping it", () => {
    expect(visibleLanguageLegend([{ languageName: "Portuguese" }])).toEqual([
      { name: "Portuguese", tone: "plum" },
    ]);
  });
});
