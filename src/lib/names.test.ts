import { describe, expect, it } from "vitest";
import { fullName, sortableName } from "./names";

describe("fullName", () => {
  it("joins a first and last name", () => {
    expect(fullName({ firstName: "Ana", lastName: "Beltrán" })).toBe("Ana Beltrán");
  });

  it("returns the first name alone when there is no surname", () => {
    // The reason this module exists: `${first} ${last}` would render "Ana null",
    // and TypeScript does not complain about interpolating null.
    expect(fullName({ firstName: "Ana", lastName: null })).toBe("Ana");
    expect(fullName({ firstName: "Ana" })).toBe("Ana");
    expect(fullName({ firstName: "Ana", lastName: "" })).toBe("Ana");
    expect(fullName({ firstName: "Ana", lastName: "   " })).toBe("Ana");
  });

  it("never leaves a trailing space", () => {
    expect(fullName({ firstName: "Ana", lastName: null })).not.toMatch(/\s$/);
  });

  it("trims stray spacing around either part", () => {
    expect(fullName({ firstName: "  Ana ", lastName: " Beltrán " })).toBe("Ana Beltrán");
  });
});

describe("sortableName", () => {
  it("puts the surname first", () => {
    expect(sortableName({ firstName: "Ana", lastName: "Beltrán" })).toBe("beltrán ana");
  });

  it("falls back to the first name when there is no surname", () => {
    expect(sortableName({ firstName: "Ana", lastName: null })).toBe("ana");
  });

  it("sorts people with and without surnames into one sequence", () => {
    const people = [
      { firstName: "Zoe", lastName: "Alvarez" },
      { firstName: "Bruno", lastName: null },
      { firstName: "Ana", lastName: "Castillo" },
    ];

    const order = [...people]
      .sort((a, b) => sortableName(a).localeCompare(sortableName(b)))
      .map((person) => person.firstName);

    // Alvarez, Bruno, Castillo — the surname-less name takes its place among them.
    expect(order).toEqual(["Zoe", "Bruno", "Ana"]);
  });
});
