import { describe, expect, it } from "vitest";
import { statusChip } from "./status-chip";

describe("statusChip", () => {
  it("shows the payment state for an active student", () => {
    expect(statusChip("ACTIVE", "PAID")).toEqual({ label: "Paid", tone: "teal" });
    expect(statusChip("ACTIVE", "PENDING")).toEqual({ label: "Pending", tone: "rose" });
    expect(statusChip("ACTIVE", "RESERVED")).toEqual({ label: "Reserved", tone: "amber" });
    expect(statusChip("ACTIVE", "BENEFIT")).toEqual({ label: "Benefit", tone: "violet" });
  });

  it("gives collaboration a neutral chip, not a colour to act on", () => {
    expect(statusChip("ACTIVE", "COLLABORATION")).toEqual({
      label: "Collaboration",
      tone: null,
    });
  });

  it("lets the lifecycle win over the payment state", () => {
    // Somebody paused or archived is not "pending" for a course they are not
    // taking, whatever their last billing state was.
    expect(statusChip("PAUSED", "PENDING")).toEqual({ label: "Paused", tone: "blue" });
    expect(statusChip("PAUSED", "PAID")).toEqual({ label: "Paused", tone: "blue" });
    expect(statusChip("ARCHIVED", "PAID").label).toBe("Archived");
  });

  it("never says Inactive, which used to mean a pause and read as gone", () => {
    for (const status of ["ACTIVE", "PAUSED", "ARCHIVED"] as const) {
      expect(statusChip(status, "PENDING").label).not.toBe("Inactive");
    }
  });

  it("never returns an empty label", () => {
    const statuses = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;
    const billings = ["PAID", "PENDING", "RESERVED", "BENEFIT", "COLLABORATION"] as const;

    for (const status of statuses) {
      for (const billing of billings) {
        expect(statusChip(status, billing).label.length).toBeGreaterThan(0);
      }
    }
  });
});
