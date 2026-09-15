import { describe, expect, it } from "vitest";
import {
  COURSE_PRICES,
  TEACHER_COURSE_PAY_CENTS,
  coursePriceCents,
  planLabel,
  resolveCoursePrices,
} from "./pricing";
import { formatAmount } from "./money";

describe("coursePriceCents", () => {
  it("gives DARPE's published peso prices", () => {
    expect(formatAmount(coursePriceCents("GROUP_EXTENSIVE", "MXN"), "MXN")).toBe(
      "$1,350 MXN"
    );
    expect(formatAmount(coursePriceCents("INDIVIDUAL_EXTENSIVE", "MXN"), "MXN")).toBe(
      "$2,999 MXN"
    );
    expect(formatAmount(coursePriceCents("INDIVIDUAL_INTENSIVE", "MXN"), "MXN")).toBe(
      "$5,300 MXN"
    );
  });

  it("gives the dollar prices, which are not a conversion of the pesos", () => {
    expect(formatAmount(coursePriceCents("GROUP_EXTENSIVE", "USD"), "USD")).toBe("$70 USD");
    expect(formatAmount(coursePriceCents("INDIVIDUAL_INTENSIVE", "USD"), "USD")).toBe(
      "$380 USD"
    );
  });

  it("prices advisory by the hour", () => {
    expect(COURSE_PRICES.ADVISORY.perHour).toBe(true);
    expect(formatAmount(coursePriceCents("ADVISORY", "MXN"), "MXN")).toBe("$370 MXN");
  });
});

describe("resolveCoursePrices", () => {
  it("lays an edited price over the published table and leaves the rest", () => {
    const prices = resolveCoursePrices([
      { modality: "INDIVIDUAL_EXTENSIVE", mxnCents: 310_000, usdCents: 19_000 },
    ]);

    expect(coursePriceCents("INDIVIDUAL_EXTENSIVE", "MXN", prices)).toBe(310_000);
    expect(coursePriceCents("INDIVIDUAL_EXTENSIVE", "USD", prices)).toBe(19_000);
    expect(coursePriceCents("GROUP_EXTENSIVE", "MXN", prices)).toBe(
      COURSE_PRICES.GROUP_EXTENSIVE.mxnCents
    );
  });

  it("keeps the course's label and hours, which Settings cannot change", () => {
    const prices = resolveCoursePrices([
      { modality: "ADVISORY", mxnCents: 40_000, usdCents: 2_700 },
    ]);

    expect(prices.ADVISORY.perHour).toBe(true);
    expect(prices.ADVISORY.label).toBe("Advisory");
    expect(prices.INDIVIDUAL_INTENSIVE.hoursPerMonth).toBe(16);
  });

  it("does not mutate the published table", () => {
    resolveCoursePrices([{ modality: "GROUP_EXTENSIVE", mxnCents: 1, usdCents: 1 }]);

    expect(COURSE_PRICES.GROUP_EXTENSIVE.mxnCents).toBe(135_000);
  });
});

describe("planLabel", () => {
  it("names the monthly plans by their classes", () => {
    expect(planLabel("GROUP_EXTENSIVE")).toBe("8 classes / month");
    expect(planLabel("INDIVIDUAL_INTENSIVE")).toBe("16 classes / month");
  });

  it("says advisory is hourly rather than inventing a class count", () => {
    expect(planLabel("ADVISORY")).toBe("Per hour");
  });
});

describe("TEACHER_COURSE_PAY_CENTS", () => {
  it("pays per finished course, at DARPE's confirmed figures", () => {
    expect(formatAmount(TEACHER_COURSE_PAY_CENTS.INDIVIDUAL_EXTENSIVE!, "MXN")).toBe(
      "$1,600 MXN"
    );
    expect(formatAmount(TEACHER_COURSE_PAY_CENTS.INDIVIDUAL_INTENSIVE!, "MXN")).toBe(
      "$3,200 MXN"
    );
    expect(formatAmount(TEACHER_COURSE_PAY_CENTS.GROUP_EXTENSIVE!, "MXN")).toBe(
      "$1,360 MXN"
    );
  });

  it("leaves advisory pay unset rather than guessing it", () => {
    expect(TEACHER_COURSE_PAY_CENTS.ADVISORY).toBeNull();
  });
});
