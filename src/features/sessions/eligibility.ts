import type { ClassStatus, ClassType, StudentStatus } from "@/generated/prisma/client";

/**
 * Students who may have new classes scheduled for them.
 *
 * Paused and archived students keep the classes they already have — this rule
 * only governs creating new ones, never editing history.
 */
export const ELIGIBLE_STUDENT_STATUSES: StudentStatus[] = ["ACTIVE", "TRIAL"];

export function isEligibleStudent(status: StudentStatus): boolean {
  return ELIGIBLE_STUDENT_STATUSES.includes(status);
}

export type ManualClassCandidate = {
  student: { name: string; status: StudentStatus; languageId: string };
  teacher: { name: string; active: boolean; languageIds: string[] };
  languageName: string;
};

export type EligibilityResult = { ok: true } | { ok: false; error: string };

export type TeacherCandidate = { name: string; active: boolean; languageIds: string[] };

/**
 * Whether a teacher may take a class in this language.
 *
 * Shared by creating a class and by changing an existing session's teacher, so
 * both answer the question the same way. It says nothing about availability —
 * that is the conflict check, which is a separate question with a separate answer.
 */
export function checkTeacherForLanguage(
  teacher: TeacherCandidate,
  language: { id: string; name: string }
): EligibilityResult {
  if (!teacher.active) {
    return {
      ok: false,
      error: `${teacher.name} is no longer active and cannot be given new classes.`,
    };
  }

  if (!teacher.languageIds.includes(language.id)) {
    return {
      ok: false,
      error: `${teacher.name} does not teach ${language.name}. Choose a teacher who does.`,
    };
  }

  return { ok: true };
}

/**
 * Whether this student and teacher may be paired for a new class.
 *
 * The class language is the student's, so the teacher has to actually teach it.
 * The teacher does not have to be the student's primary teacher: covering for a
 * colleague is normal, and the primary teacher is a default, not a restriction.
 *
 * Pure so the rules can be tested without a database, and so the server can
 * re-apply them to whatever the form submitted.
 */
export function checkManualClassEligibility(candidate: ManualClassCandidate): EligibilityResult {
  const { student, teacher, languageName } = candidate;

  if (!isEligibleStudent(student.status)) {
    return {
      ok: false,
      error: `${student.name} is ${student.status.toLowerCase()}. Classes can only be scheduled for active and trial students.`,
    };
  }

  return checkTeacherForLanguage(teacher, { id: student.languageId, name: languageName });
}

export type ManualSessionDraft = {
  session: {
    startsAt: Date;
    durationMinutes: number;
    type: ClassType;
    status: ClassStatus;
    teacherId: string;
    languageId: string;
    scheduleSlotId: null;
    slotOccurrenceOn: null;
  };
  participant: { studentId: string };
};

/**
 * The records a manually created class consists of.
 *
 * `scheduleSlotId` and `slotOccurrenceOn` stay null: this class belongs to no
 * recurring pattern, so monthly generation neither counts it as an occurrence nor
 * ever regenerates over it. The language comes from the student rather than from
 * the form, so the two can never disagree.
 *
 * Pure: the caller persists the result, which keeps the shape of a manual class
 * testable without a database.
 */
export function buildManualSession(params: {
  startsAt: Date;
  durationMinutes: number;
  teacherId: string;
  student: { id: string; languageId: string };
}): ManualSessionDraft {
  return {
    session: {
      startsAt: params.startsAt,
      durationMinutes: params.durationMinutes,
      type: "INDIVIDUAL",
      status: "SCHEDULED",
      teacherId: params.teacherId,
      languageId: params.student.languageId,
      scheduleSlotId: null,
      slotOccurrenceOn: null,
    },
    participant: { studentId: params.student.id },
  };
}
