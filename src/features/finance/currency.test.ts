import { describe, expect, it } from "vitest";
import { convertToMxnCents, formatRate, parseRateToMicros } from "./currency";

describe("parseRateToMicros", () => {
  it("reads a rate with up to six decimals", () => {
    expect(parseRateToMicros("17.07")).toBe(17_070_000);
    expect(parseRateToMicros("12.345678")).toBe(12_345_678);
    expect(parseRateToMicros("20")).toBe(20_000_000);
    expect(parseRateToMicros(" 1,000.5 ")).toBe(1_000_500_000);
  });

  it("refuses zero, negatives, too many decimals and nonsense", () => {
    for (const bad of ["", "0", "0.0", "-17", "17.1234567", "abc", "17.07.1"]) {
      expect(parseRateToMicros(bad)).toBeNull();
    }
  });

  it("refuses a rate too large to store", () => {
    expect(parseRateToMicros("5000")).toBeNull();
  });
});

describe("convertToMxnCents", () => {
  it("converts at the rate, rounding to the nearest cent", () => {
    // US$180.00 at 17.07 → $3,072.60
    expect(convertToMxnCents(18_000, 17_070_000)).toBe(307_260);
    // CA$119.00 at 12.345678 → $1,469.13
    expect(convertToMxnCents(11_900, 12_345_678)).toBe(146_914);
  });
});

describe("formatRate", () => {
  it("shows a rate without trailing zeros", () => {
    expect(formatRate(17_070_000)).toBe("17.07");
    expect(formatRate(20_000_000)).toBe("20");
    expect(formatRate(12_345_678)).toBe("12.345678");
  });
});
