import { describe, expect, it } from "vitest";
import { formatMoney, revenueChangePercent } from "./snapshot";

describe("revenueChangePercent", () => {
  it("reports a rise as a positive whole percent", () => {
    expect(
      revenueChangePercent({
        currentMonthRevenueCents: 8_640_000,
        previousMonthRevenueCents: 7_980_000,
      })
    ).toBe(8);
  });

  it("reports a fall as a negative percent", () => {
    expect(
      revenueChangePercent({
        currentMonthRevenueCents: 5_000_000,
        previousMonthRevenueCents: 10_000_000,
      })
    ).toBe(-50);
  });

  it("is null when there is nothing to compare against", () => {
    expect(
      revenueChangePercent({ currentMonthRevenueCents: 100, previousMonthRevenueCents: 0 })
    ).toBeNull();
  });

  it("is zero when the two months match", () => {
    expect(
      revenueChangePercent({
        currentMonthRevenueCents: 1_000,
        previousMonthRevenueCents: 1_000,
      })
    ).toBe(0);
  });
});

describe("formatMoney", () => {
  it("renders whole units with thousands separators and the currency", () => {
    expect(formatMoney(8_640_000, "MXN")).toBe("$86,400 MXN");
  });

  it("renders zero without a special case", () => {
    expect(formatMoney(0, "MXN")).toBe("$0 MXN");
  });

  it("rounds part-units rather than showing cents", () => {
    expect(formatMoney(150, "MXN")).toBe("$2 MXN");
  });
});
