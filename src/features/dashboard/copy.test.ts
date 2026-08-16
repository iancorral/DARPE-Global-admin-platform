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
  it("wraps the formatted academy date", () => {
    expect(DASHBOARD_COPY.contextLine("Saturday, August 15")).toBe(
      "Saturday, August 15 · Here's how DARPE is doing today."
    );
  });
});
