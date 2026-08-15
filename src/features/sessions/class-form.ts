/**
 * What the create-class form offers, given who has been chosen.
 *
 * Pure and structural: it takes the little each answer depends on rather than the
 * query types, so the choices the dialog makes on a student's behalf can be tested
 * without a browser or a database. None of it decides anything — the server
 * re-checks every pairing it is sent.
 */

export type LanguageStudent = {
  id: string;
  languageId: string;
  primaryTeacherId?: string | null;
};

export type LanguageTeacher = {
  id: string;
  languageIds: string[];
};

/**
 * Teachers who can take this class: the ones who teach the student's language.
 * The primary teacher is only a default here — covering for a colleague is normal,
 * so any qualified teacher may be chosen.
 */
export function teachersForStudent<T extends LanguageTeacher>(
  teachers: T[],
  student: { languageId: string } | undefined
): T[] {
  if (!student) return [];

  return teachers.filter((teacher) => teacher.languageIds.includes(student.languageId));
}

/**
 * The teacher the form starts on: the student's own, when they teach the language,
 * and otherwise the first who does.
 *
 * Always derived from the student, never carried over from whoever was selected
 * before. That is what makes adding a student mid-creation safe: the new student
 * may study another language, and a teacher left selected from the previous one
 * would be a pairing the server would only reject at the end.
 */
export function defaultTeacherFor(
  teachers: LanguageTeacher[],
  student: LanguageStudent | undefined
): string {
  const eligible = teachersForStudent(teachers, student);
  const primary = eligible.find((teacher) => teacher.id === student?.primaryTeacherId);

  return primary?.id ?? eligible[0]?.id ?? "";
}

/**
 * The student the form opens on: the one asked for, if they may be given a class,
 * and otherwise the first who may. An id from the address bar is a suggestion, and
 * this is where it stops being one.
 */
export function initialStudent<T extends LanguageStudent>(
  students: T[],
  requestedId: string | null | undefined
): T | undefined {
  return students.find((student) => student.id === requestedId) ?? students[0];
}
