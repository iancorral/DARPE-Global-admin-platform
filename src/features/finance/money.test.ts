import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatHours,
  formatTotals,
  parseAmountToCents,
  teachingLoad,
  totalByCurrency,
} from "./money";

describe("parseAmountToCents", () => {
  it("reads a whole amount", () => {
    expect(parseAmountToCents("2380")).toBe(238_000);
  });

  it("reads cents exactly, without floating-point drift", () => {
    // 2380.15 * 100 is 238014.99999999997 in binary floating point; splitting on
    // the point is what keeps the peso.
    expect(parseAmountToCents("2380.15")).toBe(238_015);
    expect(parseAmountToCents("0.07")).toBe(7);
    expect(parseAmountToCents("1.1")).toBe(110);
  });

  it("tolerates the symbols people type", () => {
    expect(parseAmountToCents("$1,260.00")).toBe(126_000);
    expect(parseAmountToCents(" 500 ")).toBe(50_000);
  });

  it("refuses anything that is not an amount", () => {
    for (const input of ["", "abc", "1.234", "-50", "1,2,3.4.5"]) {
      expect(parseAmountToCents(input)).toBeNull();
    }
  });
});

describe("formatAmount", () => {
  it("writes whole units with separators and the currency", () => {
    expect(formatAmount(238_000, "MXN")).toBe("$2,380 MXN");
    expect(formatAmount(38_000, "USD")).toBe("$380 USD");
  });
});

describe("totalByCurrency", () => {
  it("keeps pesos and dollars apart", () => {
    // Adding them would produce a number that is true in neither currency.
    expect(
      totalByCurrency([
        { amountCents: 100_000, currency: "MXN" },
        { amountCents: 38_000, currency: "USD" },
        { amountCents: 50_000, currency: "MXN" },
      ])
    ).toEqual([
      { currency: "MXN", amountCents: 150_000 },
      { currency: "USD", amountCents: 38_000 },
    ]);
  });

  it("only reports currencies that are actually there", () => {
    const totals = totalByCurrency([{ amountCents: 1, currency: "MXN" }]);

    expect(totals).toHaveLength(1);
    expect(totals[0]?.currency).toBe("MXN");
  });

  it("is empty for no payments", () => {
    expect(totalByCurrency([])).toEqual([]);
  });
});

describe("formatTotals", () => {
  it("joins each currency", () => {
    expect(
      formatTotals([
        { currency: "MXN", amountCents: 150_000 },
        { currency: "USD", amountCents: 38_000 },
      ])
    ).toBe("$1,500 MXN + $380 USD");
  });

  it("shows a plain zero when nothing came in", () => {
    expect(formatTotals([])).toBe("$0 MXN");
  });
});

describe("teachingLoad", () => {
  it("counts classes, minutes and the split by kind", () => {
    expect(
      teachingLoad([
        { durationMinutes: 60, type: "INDIVIDUAL" },
        { durationMinutes: 90, type: "GROUP" },
        { durationMinutes: 60, type: "INDIVIDUAL" },
      ])
    ).toEqual({
      classes: 3,
      minutes: 210,
      individualClasses: 2,
      groupClasses: 1,
    });
  });

  it("is all zeroes for a period with nothing taught", () => {
    expect(teachingLoad([])).toEqual({
      classes: 0,
      minutes: 0,
      individualClasses: 0,
      groupClasses: 0,
    });
  });
});

describe("formatHours", () => {
  it("writes whole hours plainly", () => {
    expect(formatHours(120)).toBe("2 h");
  });

  it("writes a half hour as a decimal", () => {
    expect(formatHours(90)).toBe("1.5 h");
  });

  it("handles nothing taught", () => {
    expect(formatHours(0)).toBe("0 h");
  });
});
