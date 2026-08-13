import { describe, expect, it } from "vitest";
import {
  ELIGIBLE_STUDENT_STATUSES,
  buildManualSession,
  checkManualClassEligibility,
  checkTeacherForLanguage,
  isEligibleStudent,
} from "./eligibility";

const candidate = (overrides?: {
  studentStatus?: "ACTIVE" | "TRIAL" | "PAUSED" | "ARCHIVED";
  teacherActive?: boolean;
  teacherLanguageIds?: string[];
}) => ({
  student: {
    name: "Ana Ruiz",
    status: overrides?.studentStatus ?? ("ACTIVE" as const),
    languageId: "lang-en",
  },
  teacher: {
    name: "Marta Lopez",
    active: overrides?.teacherActive ?? true,
    languageIds: overrides?.teacherLanguageIds ?? ["lang-en"],
  },
  languageName: "English",
});

describe("isEligibleStudent", () => {
  it("allows new classes for active and trial students", () => {
    expect(isEligibleStudent("ACTIVE")).toBe(true);
    expect(isEligibleStudent("TRIAL")).toBe(true);
  });

  it("refuses new classes for paused and archived students", () => {
    expect(isEligibleStudent("PAUSED")).toBe(false);
    expect(isEligibleStudent("ARCHIVED")).toBe(false);
  });

  it("matches the statuses recurring generation uses", () => {
    expect(ELIGIBLE_STUDENT_STATUSES).toEqual(["ACTIVE", "TRIAL"]);
  });
});

/** Also the rule applied when an existing session is reassigned to another teacher. */
describe("checkTeacherForLanguage", () => {
  const english = { id: "lang-en", name: "English" };
  const teacher = (overrides?: { active?: boolean; languageIds?: string[] }) => ({
    name: "Marta Lopez",
    active: overrides?.active ?? true,
    languageIds: overrides?.languageIds ?? ["lang-en"],
  });

  it("accepts an active teacher of that language", () => {
    expect(checkTeacherForLanguage(teacher(), english)).toEqual({ ok: true });
  });

  it("accepts a teacher who teaches it among several languages", () => {
    expect(
      checkTeacherForLanguage(teacher({ languageIds: ["lang-fr", "lang-en"] }), english)
    ).toEqual({ ok: true });
  });

  it("rejects an inactive teacher", () => {
    const result = checkTeacherForLanguage(teacher({ active: false }), english);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("no longer active");
  });

  it("rejects a teacher who does not teach the language", () => {
    const result = checkTeacherForLanguage(teacher({ languageIds: ["lang-fr"] }), english);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("English");
  });

  it("rejects an inactive teacher before questioning their languages", () => {
    const result = checkTeacherForLanguage(
      teacher({ active: false, languageIds: ["lang-fr"] }),
      english
    );

    expect(result.ok === false && result.error).toContain("no longer active");
  });
});

describe("checkManualClassEligibility", () => {
  it("accepts an active student with a teacher of their language", () => {
    expect(checkManualClassEligibility(candidate())).toEqual({ ok: true });
  });

  it("accepts a trial student", () => {
    expect(checkManualClassEligibility(candidate({ studentStatus: "TRIAL" }))).toEqual({
      ok: true,
    });
  });

  it("rejects a paused student and names them", () => {
    const result = checkManualClassEligibility(candidate({ studentStatus: "PAUSED" }));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("Ana Ruiz");
    expect(result.ok === false && result.error).toContain("paused");
  });

  it("rejects an archived student", () => {
    expect(checkManualClassEligibility(candidate({ studentStatus: "ARCHIVED" })).ok).toBe(false);
  });

  it("rejects an inactive teacher", () => {
    const result = checkManualClassEligibility(candidate({ teacherActive: false }));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("no longer active");
  });

  it("rejects a teacher who does not teach the student's language", () => {
    const result = checkManualClassEligibility(candidate({ teacherLanguageIds: ["lang-fr"] }));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("English");
  });

  it("accepts a teacher who teaches the language among several", () => {
    const result = checkManualClassEligibility(
      candidate({ teacherLanguageIds: ["lang-fr", "lang-en"] })
    );

    expect(result).toEqual({ ok: true });
  });

  it("reports the student before the teacher when both are ineligible", () => {
    const result = checkManualClassEligibility(
      candidate({ studentStatus: "ARCHIVED", teacherActive: false })
    );

    expect(result.ok === false && result.error).toContain("Ana Ruiz");
  });
});

describe("buildManualSession", () => {
  const startsAt = new Date("2026-08-20T15:00:00Z");

  const draft = buildManualSession({
    startsAt,
    durationMinutes: 60,
    teacherId: "teacher-1",
    student: { id: "student-1", languageId: "lang-en" },
  });

  it("creates an individual class that is scheduled", () => {
    expect(draft.session.type).toBe("INDIVIDUAL");
    expect(draft.session.status).toBe("SCHEDULED");
  });

  it("belongs to no recurring slot, so generation never claims or overwrites it", () => {
    expect(draft.session.scheduleSlotId).toBeNull();
    expect(draft.session.slotOccurrenceOn).toBeNull();
  });

  it("takes the language from the student rather than the form", () => {
    expect(draft.session.languageId).toBe("lang-en");
  });

  it("keeps the requested time and teacher", () => {
    expect(draft.session.startsAt).toBe(startsAt);
    expect(draft.session.durationMinutes).toBe(60);
    expect(draft.session.teacherId).toBe("teacher-1");
  });

  it("links the participant to the selected student", () => {
    expect(draft.participant).toEqual({ studentId: "student-1" });
  });
});
