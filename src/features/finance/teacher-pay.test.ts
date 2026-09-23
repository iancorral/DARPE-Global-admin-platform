import { describe, expect, it } from "vitest";
import {
  classPayCents,
  countsTowardsGroupSize,
  defaultPayWeekStart,
  groupHourlyCents,
  hourlyRateCents,
  payWeekEnd,
  paydayFor,
  selectedPayWeek,
} from "./teacher-pay";

describe("hourly rates", () => {
  it("pays $200 an hour for an individual class", () => {
    expect(hourlyRateCents("INDIVIDUAL", 1)).toBe(20_000);
  });

  it("pays groups from $170 at two students, $10 more per extra student", () => {
    expect(groupHourlyCents(2)).toBe(17_000);
    expect(groupHourlyCents(3)).toBe(18_000);
    expect(groupHourlyCents(4)).toBe(19_000);
    expect(groupHourlyCents(5)).toBe(20_000);
  });

  it("pays a one-student group the base, and caps a large group at five", () => {
    expect(groupHourlyCents(1)).toBe(17_000);
    expect(groupHourlyCents(0)).toBe(17_000);
    expect(groupHourlyCents(8)).toBe(20_000);
  });
});

describe("classPayCents", () => {
  it("scales the hourly rate by the class length", () => {
    expect(classPayCents({ type: "INDIVIDUAL", students: 1, durationMinutes: 60 })).toBe(20_000);
    expect(classPayCents({ type: "INDIVIDUAL", students: 1, durationMinutes: 120 })).toBe(40_000);
    expect(classPayCents({ type: "GROUP", students: 4, durationMinutes: 90 })).toBe(28_500);
  });
});

describe("countsTowardsGroupSize", () => {
  it("counts everyone except the absent and the excused", () => {
    expect(countsTowardsGroupSize("PRESENT")).toBe(true);
    expect(countsTowardsGroupSize("LATE")).toBe(true);
    expect(countsTowardsGroupSize(null)).toBe(true);
    expect(countsTowardsGroupSize("ABSENT")).toBe(false);
    expect(countsTowardsGroupSize("EXCUSED")).toBe(false);
  });
});

describe("pay weeks", () => {
  it("runs Monday to Sunday and is paid the Friday after", () => {
    expect(payWeekEnd("2026-09-14")).toBe("2026-09-20");
    expect(paydayFor("2026-09-14")).toBe("2026-09-25");
  });

  it("defaults to the last week that has fully ended", () => {
    // Monday the 21st: last week (14–20) is the one to pay this Friday.
    expect(defaultPayWeekStart("2026-09-21")).toBe("2026-09-14");
    // Sunday the 20th: that week has not ended yet.
    expect(defaultPayWeekStart("2026-09-20")).toBe("2026-09-07");
  });

  it("reads any day of a week from the address, and refuses the future", () => {
    expect(selectedPayWeek("2026-09-10", "2026-09-21")).toBe("2026-09-07");
    expect(selectedPayWeek("2026-09-21", "2026-09-21")).toBe("2026-09-21");
    expect(selectedPayWeek("2026-10-05", "2026-09-21")).toBe("2026-09-14");
    expect(selectedPayWeek("nonsense", "2026-09-21")).toBe("2026-09-14");
    expect(selectedPayWeek(undefined, "2026-09-21")).toBe("2026-09-14");
  });
});
