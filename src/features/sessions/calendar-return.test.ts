import { describe, expect, it } from "vitest";
import { addDaysToDate } from "@/lib/datetime";
import { MAX_SERIES_SPAN_DAYS } from "@/features/schedules/series";
import { weeklySeriesSchema } from "@/features/schedules/schemas";
import { defaultTeacherFor, initialStudent, teachersForStudent } from "./class-form";
import {
  CALENDAR_PATH,
  CREATE_MODES,
  DEFAULT_CREATE_MODE,
  NEW_STUDENT_PATH,
  calendarCreateIntent,
  calendarReturnUrl,
  newStudentUrl,
  parseCalendarReturn,
  preselectedStudentId,
  scheduleForStudentUrl,
  type CalendarReturnContext,
} from "./calendar-return";
import { calendarMode, offersCreation, offersMoveDestinations } from "./scheduling";

/**
 * The round trip out to the student form and back, treated as what it is: values
 * from the address bar that anybody can type.
 */

const context: CalendarReturnContext = {
  from: "calendar",
  week: "2026-08-17",
  date: "2026-08-19",
  time: "09:30",
  mode: "weekly",
  teacher: "teacher1",
};

/** The query of a built url, as a page would receive it. */
const paramsOf = (url: string) =>
  Object.fromEntries(new URL(url, "https://darpe.invalid").searchParams);

const pathOf = (url: string) => new URL(url, "https://darpe.invalid").pathname;

describe("parseCalendarReturn", () => {
  it("accepts the calendar's own context", () => {
    expect(parseCalendarReturn(context)).toEqual(context);
  });

  it("accepts one without a teacher filter", () => {
    expect(parseCalendarReturn({ ...context, teacher: undefined })?.teacher).toBeUndefined();
  });

  it("refuses anything that is not the calendar", () => {
    for (const from of [
      "https://evil.example/steal",
      "//evil.example",
      "http://localhost:3000/calendar",
      "/students",
      "javascript:alert(1)",
      "Calendar",
      "",
      undefined,
    ]) {
      expect(parseCalendarReturn({ ...context, from })).toBeNull();
    }
  });

  it("refuses a malformed date, time or mode rather than guessing", () => {
    expect(parseCalendarReturn({ ...context, date: "19-08-2026" })).toBeNull();
    expect(parseCalendarReturn({ ...context, time: "9:30" })).toBeNull();
    expect(parseCalendarReturn({ ...context, time: "25:00" })).toBeNull();
    expect(parseCalendarReturn({ ...context, mode: "monthly" })).toBeNull();
    expect(parseCalendarReturn({ ...context, week: "" })).toBeNull();
  });

  it("refuses a teacher id that is not shaped like one of ours", () => {
    expect(parseCalendarReturn({ ...context, teacher: "../../etc/passwd" })).toBeNull();
    expect(parseCalendarReturn({ ...context, teacher: "a b" })).toBeNull();
  });

  it("drops anything else that was smuggled alongside it", () => {
    const parsed = parseCalendarReturn({
      ...context,
      name: "Ana Ruiz",
      email: "ana@example.com",
      returnTo: "https://evil.example",
    });

    expect(Object.keys(parsed ?? {}).sort()).toEqual([
      "date",
      "from",
      "mode",
      "teacher",
      "time",
      "week",
    ]);
  });

  it("refuses repeated params, which arrive as arrays", () => {
    expect(parseCalendarReturn({ ...context, date: ["2026-08-19", "2026-08-20"] })).toBeNull();
  });
});

describe("the urls the round trip uses", () => {
  it("goes to this application's student form and nowhere else", () => {
    expect(pathOf(newStudentUrl(context))).toBe(NEW_STUDENT_PATH);
    expect(newStudentUrl(context).startsWith(`${NEW_STUDENT_PATH}?`)).toBe(true);
  });

  it("comes back to this application's calendar and nowhere else", () => {
    expect(pathOf(calendarReturnUrl(context, "student1"))).toBe(CALENDAR_PATH);
    expect(calendarReturnUrl(context).startsWith(`${CALENDAR_PATH}?`)).toBe(true);
  });

  it("cannot be steered at another host or protocol", () => {
    const hostile: CalendarReturnContext = {
      ...context,
      teacher: "teacher1",
    };

    for (const url of [newStudentUrl(hostile), calendarReturnUrl(hostile, "student1")]) {
      expect(url.startsWith("/")).toBe(true);
      expect(url.startsWith("//")).toBe(false);
      expect(url).not.toMatch(/https?:|javascript:|data:/i);
      expect(new URL(url, "https://darpe.invalid").host).toBe("darpe.invalid");
    }
  });

  it("carries only the position, the week, the mode and ids", () => {
    expect(Object.keys(paramsOf(newStudentUrl(context))).sort()).toEqual([
      "date",
      "from",
      "mode",
      "teacher",
      "time",
      "week",
    ]);
    expect(Object.keys(paramsOf(calendarReturnUrl(context, "student1"))).sort()).toEqual([
      "date",
      "mode",
      "student",
      "teacher",
      "time",
      "week",
    ]);
  });

  it("carries no personal information about anybody", () => {
    const values = Object.values(paramsOf(calendarReturnUrl(context, "student1"))).join(" ");

    // Ids, dates, a time and a mode: nothing that names or describes a person.
    expect(values).not.toMatch(/@|\+?\d{7,}/);
    expect(values.split(" ").every((value) => /^[A-Za-z0-9:_-]+$/.test(value))).toBe(true);
  });

  it("comes back with only the new student's id, not their details", () => {
    expect(paramsOf(calendarReturnUrl(context, "student1")).student).toBe("student1");
  });

  it("leaves out a student id that is not one of ours", () => {
    for (const id of ["https://evil.example", "../admin", "", null]) {
      expect(paramsOf(calendarReturnUrl(context, id)).student).toBeUndefined();
    }
  });

  it("survives the whole trip: dialog to student form and back to the same position", () => {
    const returned = parseCalendarReturn(paramsOf(newStudentUrl(context)));

    expect(returned).toEqual(context);

    const intent = calendarCreateIntent(paramsOf(calendarReturnUrl(returned!, "student1")));

    expect(intent).toEqual({
      date: "2026-08-19",
      startMinutes: 570,
      mode: "weekly",
      studentId: "student1",
      durationMinutes: null,
      endsOn: null,
    });
  });

  it("sends a student's profile to the calendar with only their id", () => {
    const url = scheduleForStudentUrl("2026-08-17", "student1");

    expect(pathOf(url)).toBe(CALENDAR_PATH);
    expect(paramsOf(url)).toEqual({ week: "2026-08-17", student: "student1" });
  });
});

describe("calendarCreateIntent", () => {
  const creating = { date: "2026-08-19", time: "09:30", mode: "one-time" };

  it("reopens the dialog at the position in the url", () => {
    expect(calendarCreateIntent(creating)).toEqual({
      date: "2026-08-19",
      startMinutes: 570,
      mode: "one-time",
      studentId: null,
      durationMinutes: null,
      endsOn: null,
    });
  });

  it("never reopens it while a class is being moved", () => {
    // A position in the grid means one thing at a time, and during a move it
    // means "put the class here".
    expect(calendarCreateIntent({ ...creating, moving: "session-1" })).toBeNull();
  });

  it("agrees with the calendar's own mode, so the two can never both be offered", () => {
    const mode = calendarMode("session-1");

    expect(offersCreation(mode)).toBe(false);
    expect(offersMoveDestinations(mode)).toBe(true);
    expect(calendarCreateIntent({ ...creating, moving: "session-1" })).toBeNull();

    const browsing = calendarMode(null);

    expect(offersCreation(browsing)).toBe(true);
    expect(offersMoveDestinations(browsing)).toBe(false);
    expect(calendarCreateIntent(creating)).not.toBeNull();
  });

  it("shows the week instead of guessing when the position is incomplete", () => {
    expect(calendarCreateIntent({ time: "09:30" })).toBeNull();
    expect(calendarCreateIntent({ date: "2026-08-19" })).toBeNull();
    expect(calendarCreateIntent({})).toBeNull();
  });

  it("shows the week instead of guessing when the position is malformed", () => {
    expect(calendarCreateIntent({ ...creating, date: "tomorrow" })).toBeNull();
    expect(calendarCreateIntent({ ...creating, time: "09:5" })).toBeNull();
    expect(calendarCreateIntent({ ...creating, time: "24:00" })).toBeNull();
  });

  it("falls back to a single class when the mode is not one it knows", () => {
    expect(calendarCreateIntent({ ...creating, mode: "monthly" })?.mode).toBe(
      DEFAULT_CREATE_MODE
    );
    expect(calendarCreateIntent({ ...creating, mode: undefined })?.mode).toBe(
      DEFAULT_CREATE_MODE
    );
    expect(DEFAULT_CREATE_MODE).toBe("one-time");
  });

  it("keeps both modes the calendar offers and nothing else", () => {
    expect(CREATE_MODES).toEqual(["one-time", "weekly"]);
  });

  it("preselects only an id, and only one that could be ours", () => {
    expect(calendarCreateIntent({ ...creating, student: "student1" })?.studentId).toBe(
      "student1"
    );
    expect(calendarCreateIntent({ ...creating, student: "Ana Ruiz" })?.studentId).toBeNull();
    expect(calendarCreateIntent({ ...creating, student: "" })?.studentId).toBeNull();
  });
});

/**
 * The two answers already given about the class itself. They describe the class,
 * not the people in it, so carrying them costs no privacy and saves retyping.
 */
describe("what the round trip preserves", () => {
  const oneTime: CalendarReturnContext = { ...context, mode: "one-time", duration: 90 };
  const weekly: CalendarReturnContext = {
    ...context,
    mode: "weekly",
    duration: 45,
    until: "2026-09-16",
  };

  /** Out to the student form, back again, and read as the calendar reads it. */
  const roundTrip = (from: CalendarReturnContext, studentId?: string) => {
    const returned = parseCalendarReturn(paramsOf(newStudentUrl(from)));

    return {
      returned,
      intent: returned
        ? calendarCreateIntent(paramsOf(calendarReturnUrl(returned, studentId)))
        : null,
    };
  };

  it("brings a one-time class's duration back", () => {
    const { returned, intent } = roundTrip(oneTime, "student1");

    expect(returned?.duration).toBe(90);
    expect(intent?.durationMinutes).toBe(90);
    expect(intent?.mode).toBe("one-time");
  });

  it("brings a weekly class's duration and repeat-until date back", () => {
    const { returned, intent } = roundTrip(weekly, "student1");

    expect(returned).toMatchObject({ duration: 45, until: "2026-09-16" });
    expect(intent).toMatchObject({
      mode: "weekly",
      durationMinutes: 45,
      endsOn: "2026-09-16",
      studentId: "student1",
    });
  });

  it("brings them back when the student form is cancelled too", () => {
    const { intent } = roundTrip(weekly);

    expect(intent).toMatchObject({
      durationMinutes: 45,
      endsOn: "2026-09-16",
      studentId: null,
    });
  });

  it("falls back to the default duration when it is not one the calendar offers", () => {
    for (const duration of [75, 0, -60, 1440, "sixty", "", null, undefined]) {
      expect(parseCalendarReturn({ ...oneTime, duration })?.duration).toBeUndefined();
    }

    // The same values as a URL delivers them, which is always as text.
    for (const duration of ["75", "0", "-60", "1440", "sixty", ""]) {
      expect(
        calendarCreateIntent({ ...paramsOf(newStudentUrl(oneTime)), duration })
          ?.durationMinutes
      ).toBeNull();
    }
  });

  it("falls back to the default duration rather than losing the position", () => {
    const intent = calendarCreateIntent({
      ...paramsOf(newStudentUrl(oneTime)),
      duration: "not-a-duration",
    });

    expect(intent?.durationMinutes).toBeNull();
    expect(intent?.date).toBe(context.date);
    expect(intent?.startMinutes).toBe(570);
  });

  it("falls back to the default repeat-until date when it is malformed", () => {
    for (const until of ["16/09/2026", "2026-09-31", "next month", "", null]) {
      expect(parseCalendarReturn({ ...weekly, until })?.until).toBeUndefined();
      expect(
        calendarCreateIntent({ ...paramsOf(newStudentUrl(weekly)), until })?.endsOn
      ).toBeNull();
    }
  });

  it("refuses a repeat-until date outside the range a series may cover", () => {
    // Before the first class, or beyond the longest series creation allows.
    const tooEarly = "2026-08-18";
    const tooLate = addDaysToDate(context.date, MAX_SERIES_SPAN_DAYS + 1);
    const lastAllowed = addDaysToDate(context.date, MAX_SERIES_SPAN_DAYS);

    expect(parseCalendarReturn({ ...weekly, until: tooEarly })?.until).toBeUndefined();
    expect(parseCalendarReturn({ ...weekly, until: tooLate })?.until).toBeUndefined();
    expect(parseCalendarReturn({ ...weekly, until: lastAllowed })?.until).toBe(lastAllowed);
    expect(parseCalendarReturn({ ...weekly, until: context.date })?.until).toBe(context.date);
  });

  it("agrees with what weekly-series creation will accept", () => {
    const accepted = parseCalendarReturn({
      ...weekly,
      until: addDaysToDate(context.date, MAX_SERIES_SPAN_DAYS),
    });

    expect(
      weeklySeriesSchema.safeParse({
        studentId: "student1",
        teacherId: "teacher1",
        startsOn: context.date,
        endsOn: accepted?.until,
        startTime: context.time,
        durationMinutes: accepted?.duration,
      }).success
    ).toBe(true);
  });

  it("ignores a repeat-until date on a one-time class, and never writes one", () => {
    expect(parseCalendarReturn({ ...oneTime, until: "2026-09-16" })?.until).toBeUndefined();
    expect(paramsOf(newStudentUrl({ ...oneTime, until: "2026-09-16" })).until).toBeUndefined();
    expect(
      calendarCreateIntent({ ...paramsOf(newStudentUrl(oneTime)), until: "2026-09-16" })?.endsOn
    ).toBeNull();
  });

  it("drops a repeat-until date when the mode changes back to one-time", () => {
    const url = calendarReturnUrl({ ...weekly, mode: "one-time" }, "student1");

    expect(paramsOf(url).until).toBeUndefined();
  });

  it("still carries nothing but the position, the class's own values and ids", () => {
    expect(Object.keys(paramsOf(newStudentUrl(weekly))).sort()).toEqual([
      "date",
      "duration",
      "from",
      "mode",
      "teacher",
      "time",
      "until",
      "week",
    ]);
    expect(Object.keys(paramsOf(calendarReturnUrl(weekly, "student1"))).sort()).toEqual([
      "date",
      "duration",
      "mode",
      "student",
      "teacher",
      "time",
      "until",
      "week",
    ]);
  });

  it("still names nobody: every value is a date, a time, a number or an id", () => {
    const values = Object.values(paramsOf(calendarReturnUrl(weekly, "student1")));

    expect(values.join(" ")).not.toMatch(/@|\+?\d{7,}/);
    expect(values.every((value) => /^[A-Za-z0-9:_-]+$/.test(value))).toBe(true);
  });

  it("still cannot be steered at another host", () => {
    for (const url of [newStudentUrl(weekly), calendarReturnUrl(weekly, "student1")]) {
      expect(url.startsWith("/")).toBe(true);
      expect(url.startsWith("//")).toBe(false);
      expect(url).not.toMatch(/https?:|javascript:|data:/i);
      expect(new URL(url, "https://darpe.invalid").host).toBe("darpe.invalid");
    }
  });

  it("carries no teacher for the class itself, only the calendar's filter", () => {
    // `teacher` is which teacher the week is filtered to. The class's teacher is
    // not preserved at all, so it cannot come back attached to a student who
    // studies something else.
    expect(paramsOf(newStudentUrl(weekly)).teacher).toBe(context.teacher);
    expect(parseCalendarReturn(paramsOf(newStudentUrl(weekly)))?.teacher).toBe(
      context.teacher
    );
  });
});

/**
 * Coming back with a new student re-answers the teacher question from scratch,
 * which is why the class's teacher is not among the values carried.
 */
describe("the teacher after a student is created", () => {
  const teachers = [
    { id: "teacher-en", languageIds: ["lang-en"] },
    { id: "teacher-fr", languageIds: ["lang-fr"] },
    { id: "teacher-both", languageIds: ["lang-en", "lang-fr"] },
  ];
  const existing = { id: "student-en", languageId: "lang-en", primaryTeacherId: "teacher-en" };
  const created = { id: "student-fr", languageId: "lang-fr", primaryTeacherId: null };

  it("offers only the teachers of the new student's language", () => {
    expect(teachersForStudent(teachers, created).map((t) => t.id)).toEqual([
      "teacher-fr",
      "teacher-both",
    ]);
  });

  it("never leaves the previous student's teacher selected", () => {
    const before = defaultTeacherFor(teachers, existing);
    const after = defaultTeacherFor(teachers, initialStudent([created, existing], created.id));

    expect(before).toBe("teacher-en");
    expect(after).toBe("teacher-fr");
  });

  it("prefers the new student's own teacher when they teach the language", () => {
    expect(
      defaultTeacherFor(teachers, { ...created, primaryTeacherId: "teacher-both" })
    ).toBe("teacher-both");
  });

  it("selects nobody when no teacher teaches what they study", () => {
    expect(defaultTeacherFor(teachers, { ...created, languageId: "lang-de" })).toBe("");
    expect(teachersForStudent(teachers, { languageId: "lang-de" })).toEqual([]);
  });

  it("falls back to the first student when the id in the url is not one of them", () => {
    expect(initialStudent([existing], "student-fr")?.id).toBe("student-en");
    expect(initialStudent([], "student-fr")).toBeUndefined();
  });
});

describe("preselectedStudentId", () => {
  it("accepts an id shaped like one this application generates", () => {
    expect(preselectedStudentId("clx1234abcd")).toBe("clx1234abcd");
  });

  it("refuses anything else, so the form falls back to its own default", () => {
    for (const value of [
      "ana@example.com",
      "../../students",
      "https://evil.example",
      "a".repeat(65),
      "",
      undefined,
      null,
    ]) {
      expect(preselectedStudentId(value)).toBeNull();
    }
  });
});
