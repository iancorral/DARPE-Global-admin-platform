import { describe, expect, it } from "vitest";
import { findOverlap, overlaps, partitionByTeacherAvailability } from "./conflicts";

const at = (time: string, durationMinutes: number) => ({
  startsAt: new Date(`2026-08-12T${time}:00Z`),
  durationMinutes,
});

describe("overlaps", () => {
  it("detects classes running at the same moment", () => {
    expect(overlaps(at("09:00", 60), at("09:30", 60))).toBe(true);
  });

  it("allows back-to-back classes", () => {
    expect(overlaps(at("09:00", 60), at("10:00", 60))).toBe(false);
  });
});

/**
 * The predicate a single new or moved class is checked with. Candidates are
 * already narrowed to one teacher and to teacher-occupying statuses by the query,
 * so this only decides the time comparison.
 */
describe("findOverlap", () => {
  it("finds the class that would double-book the teacher", () => {
    expect(findOverlap(at("09:30", 60), [at("09:00", 60)])).not.toBeNull();
  });

  it("allows a class that starts exactly when another ends", () => {
    expect(findOverlap(at("10:00", 60), [at("09:00", 60)])).toBeNull();
  });

  it("allows a class that ends exactly when another starts", () => {
    expect(findOverlap(at("08:00", 60), [at("09:00", 60)])).toBeNull();
  });

  it("reports no conflict when the teacher has nothing booked", () => {
    expect(findOverlap(at("09:00", 60), [])).toBeNull();
  });

  it("finds a longer class still running when the new one starts", () => {
    expect(findOverlap(at("09:30", 30), [at("09:00", 120)])).not.toBeNull();
  });
});

describe("partitionByTeacherAvailability", () => {
  const withTeacher = (teacherId: string, time: string, durationMinutes = 60) => ({
    teacherId,
    ...at(time, durationMinutes),
  });

  it("refuses a second class for the same teacher at the same time", () => {
    const { accepted, conflicted } = partitionByTeacherAvailability(
      [withTeacher("t1", "09:30")],
      [withTeacher("t1", "09:00")]
    );

    expect(accepted).toHaveLength(0);
    expect(conflicted).toHaveLength(1);
  });

  it("lets different teachers teach at the same time", () => {
    const { accepted, conflicted } = partitionByTeacherAvailability(
      [withTeacher("t2", "09:00")],
      [withTeacher("t1", "09:00")]
    );

    expect(accepted).toHaveLength(1);
    expect(conflicted).toHaveLength(0);
  });

  it("stops two classes in the same batch from double booking one teacher", () => {
    const { accepted, conflicted } = partitionByTeacherAvailability(
      [withTeacher("t1", "09:00"), withTeacher("t1", "09:30")],
      []
    );

    expect(accepted).toHaveLength(1);
    expect(conflicted).toHaveLength(1);
  });
});
