import { describe, expect, it } from "vitest";
import {
  TEACHER_OCCUPYING_STATUSES,
  canEditScheduling,
  canRecordAttendance,
  canTransition,
} from "./lifecycle";

describe("canTransition", () => {
  it("lets a scheduled class be completed or cancelled", () => {
    expect(canTransition("SCHEDULED", "COMPLETED")).toBe(true);
    expect(canTransition("SCHEDULED", "CANCELLED")).toBe(true);
  });

  it("lets a finished class be reopened", () => {
    expect(canTransition("COMPLETED", "SCHEDULED")).toBe(true);
    expect(canTransition("CANCELLED", "SCHEDULED")).toBe(true);
  });

  it("refuses to move directly between the two finished states", () => {
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransition("CANCELLED", "COMPLETED")).toBe(false);
  });

  it("treats a status as not transitioning to itself", () => {
    expect(canTransition("SCHEDULED", "SCHEDULED")).toBe(false);
    expect(canTransition("COMPLETED", "COMPLETED")).toBe(false);
  });
});

describe("canEditScheduling", () => {
  it("allows editing only while the class is still a plan", () => {
    expect(canEditScheduling("SCHEDULED")).toBe(true);
    expect(canEditScheduling("COMPLETED")).toBe(false);
    expect(canEditScheduling("CANCELLED")).toBe(false);
  });
});

describe("canRecordAttendance", () => {
  it("allows recording while completing and correcting afterwards", () => {
    expect(canRecordAttendance("SCHEDULED")).toBe(true);
    expect(canRecordAttendance("COMPLETED")).toBe(true);
  });

  it("refuses attendance for a class that never happened", () => {
    expect(canRecordAttendance("CANCELLED")).toBe(false);
  });
});

describe("TEACHER_OCCUPYING_STATUSES", () => {
  it("keeps a completed class occupying the teacher's time", () => {
    expect(TEACHER_OCCUPYING_STATUSES).toContain("COMPLETED");
  });

  it("frees the teacher only when the class is cancelled", () => {
    expect(TEACHER_OCCUPYING_STATUSES).not.toContain("CANCELLED");
    expect(TEACHER_OCCUPYING_STATUSES).toContain("SCHEDULED");
  });
});
