import { describe, expect, it } from "vitest";
import { DASHBOARD_COPY, greetingForHour } from "./copy";

describe("greetingForHour", () => {
  it("greets the morning from midnight up to noon", () => {
    expect(greetingForHour(0)).toBe("Good morning");
    expect(greetingForHour(6)).toBe("Good morning");
    expect(greetingForHour(11)).toBe("Good morning");
  });

  it("switches to afternoon exactly at 12:00", () => {
    expect(greetingForHour(12)).toBe("Good afternoon");
    expect(greetingForHour(17)).toBe("Good afternoon");
  });

  it("switches to evening exactly at 18:00", () => {
    expect(greetingForHour(18)).toBe("Good evening");
    expect(greetingForHour(23)).toBe("Good evening");
  });
});

describe("contextLine", () => {
  it("reports the month's taught and scheduled classes", () => {
    expect(DASHBOARD_COPY.contextLine("Saturday, August 15", "August", 24, 18)).toBe(
      "Saturday, August 15 · 24 classes taught in August, 18 still scheduled."
    );
  });

  it("keeps a single class singular", () => {
    expect(DASHBOARD_COPY.contextLine("Sunday, August 2", "August", 1, 0)).toBe(
      "Sunday, August 2 · 1 class taught in August, 0 still scheduled."
    );
  });
});
