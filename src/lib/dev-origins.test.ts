import { describe, expect, it } from "vitest";
import { isAllowedDevHost, parseDevOrigins } from "./dev-origins";

describe("isAllowedDevHost", () => {
  it("accepts a LAN address", () => {
    expect(isAllowedDevHost("192.168.1.69")).toBe(true);
  });

  it("accepts hostnames, including .local names and hyphens", () => {
    expect(isAllowedDevHost("my-laptop.local")).toBe(true);
    expect(isAllowedDevHost("phone")).toBe(true);
  });

  it("rejects wildcards, which would admit a whole network", () => {
    expect(isAllowedDevHost("192.168.*.*")).toBe(false);
    expect(isAllowedDevHost("10.*.*.*")).toBe(false);
    expect(isAllowedDevHost("*.local")).toBe(false);
    expect(isAllowedDevHost("*")).toBe(false);
  });

  it("rejects a scheme, port or path, which Next never matches against", () => {
    expect(isAllowedDevHost("http://192.168.1.69")).toBe(false);
    expect(isAllowedDevHost("192.168.1.69:3000")).toBe(false);
    expect(isAllowedDevHost("192.168.1.69/app")).toBe(false);
    expect(isAllowedDevHost("user@192.168.1.69")).toBe(false);
  });

  it("rejects malformed addresses", () => {
    expect(isAllowedDevHost("192.168.1.999")).toBe(false);
    expect(isAllowedDevHost("192.168.1")).toBe(false);
    expect(isAllowedDevHost("192.168.01.1")).toBe(false);
  });

  it("rejects malformed hostnames", () => {
    expect(isAllowedDevHost("")).toBe(false);
    expect(isAllowedDevHost(".local")).toBe(false);
    expect(isAllowedDevHost("host..local")).toBe(false);
    expect(isAllowedDevHost("-host.local")).toBe(false);
    expect(isAllowedDevHost("host-.local")).toBe(false);
    expect(isAllowedDevHost("3000")).toBe(false);
  });

  it("rejects anything longer than a DNS name may be", () => {
    expect(isAllowedDevHost(`${"a".repeat(64)}.local`)).toBe(false);
    expect(isAllowedDevHost(`${"a".repeat(60)}.`.repeat(5))).toBe(false);
  });
});

describe("parseDevOrigins", () => {
  it("trusts nothing when the variable is absent, leaving localhost to Next", () => {
    expect(parseDevOrigins(undefined)).toEqual({ allowed: [], rejected: [] });
    expect(parseDevOrigins("")).toEqual({ allowed: [], rejected: [] });
  });

  it("reads one exact host", () => {
    expect(parseDevOrigins("192.168.1.69").allowed).toEqual(["192.168.1.69"]);
  });

  it("reads several devices, ignoring surrounding spaces and blank entries", () => {
    expect(parseDevOrigins(" 192.168.1.69 , my-laptop.local ,, phone ").allowed).toEqual([
      "192.168.1.69",
      "my-laptop.local",
      "phone",
    ]);
  });

  it("lower-cases hosts, because Next compares them lower-cased", () => {
    expect(parseDevOrigins("My-Laptop.Local").allowed).toEqual(["my-laptop.local"]);
  });

  it("de-duplicates rather than repeating a host", () => {
    expect(parseDevOrigins("192.168.1.69,192.168.1.69").allowed).toEqual(["192.168.1.69"]);
  });

  it("drops invalid entries instead of widening access, and reports them", () => {
    const result = parseDevOrigins("192.168.1.69,192.168.*.*,http://x:3000");

    expect(result.allowed).toEqual(["192.168.1.69"]);
    expect(result.rejected).toEqual(["192.168.*.*", "http://x:3000"]);
  });

  it("keeps the good hosts when only some entries are bad", () => {
    const result = parseDevOrigins("bad host,192.168.1.70");

    expect(result.allowed).toEqual(["192.168.1.70"]);
    expect(result.rejected).toEqual(["bad host"]);
  });
});
