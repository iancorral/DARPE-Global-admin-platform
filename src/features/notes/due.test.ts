import { describe, expect, it } from "vitest";
import { dueState } from "./due";

describe("dueState", () => {
  it("places a reminder before, on or after today", () => {
    expect(dueState("2026-09-20", "2026-09-21")).toBe("overdue");
    expect(dueState("2026-09-21", "2026-09-21")).toBe("today");
    expect(dueState("2026-09-22", "2026-09-21")).toBe("upcoming");
  });

  it("has nothing to say about a note without a reminder", () => {
    expect(dueState(null, "2026-09-21")).toBeNull();
  });
});
