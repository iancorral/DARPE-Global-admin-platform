import { describe, expect, it } from "vitest";
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
      { name: "English", tone: "violet" },
      { name: "Spanish", tone: "teal" },
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
    expect(entries[0]).toEqual({ name: "Italian", tone: "amber" });
  });

  it("gives an unrecognised language the neutral tone rather than dropping it", () => {
    expect(visibleLanguageLegend([{ languageName: "Portuguese" }])).toEqual([
      { name: "Portuguese", tone: "plum" },
    ]);
  });
});
