import "server-only";
import { db } from "@/lib/db";
import {
  DEFAULT_TIMEZONE,
  addDaysToDate,
  formatDateOnly,
  formatInZone,
  parseDateOnly,
  startOfWeekDate,
  zonedToUtc,
} from "@/lib/datetime";
import { dashboardWindows } from "@/features/dashboard/windows";
import { fullName } from "@/lib/names";
import { totalByCurrency, type CurrencyTotal } from "./money";
import { coursePriceCents, planLabel } from "./pricing";
import {
  PAY_WEEK_DAYS,
  classPayCents,
  countsTowardsGroupSize,
  hourlyRateCents,
  payWeekEnd,
  shiftPayWeek,
} from "./teacher-pay";
import {
  financeMonthNav,
  monthStartOf,
  monthsEndingAt,
  shiftMonthStart,
} from "./months";
import { getCoursePrices } from "@/features/settings/queries";
import type {
  BillingStatus,
  ClassType,
  Currency,
  Modality,
  PaymentMethod,
  Prisma,
  StudentStatus,
} from "@/generated/prisma/client";

export type FinanceOverview = {
  monthLabel: string;
  /** Just the month's name, for a sentence that already carries the year. */
  monthNameLabel: string;
  monthStartDate: string;
  monthEndDate: string;
  /** Received in the selected month, per currency. */
  monthReceived: CurrencyTotal[];
  previousMonthReceived: CurrencyTotal[];
  /** By how the money arrived, in the selected month. */
  byMethod: { method: PaymentMethod; totals: CurrencyTotal[] }[];
  /** Six months ending at the selected one, oldest first. */
  monthly: { monthStart: string; label: string; totals: CurrencyTotal[] }[];
  paymentCount: number;
  /** Where the month pager may go. Null means there is nothing that way. */
  previousMonthStart: string | null;
  nextMonthStart: string | null;
  /** True when the selected month is the one happening now. */
  isCurrentMonth: boolean;
};

const MONTHS_SHOWN = 6;

/**
 * Everything the finance screen shows for one month, all of it money received.
 *
 * The month is a parameter rather than always today's: staff close a month
 * after it ends, so the screen has to be able to look back at one. Which months
 * can be reached is decided by `financeMonthNav` from the payments on record,
 * so the pager never walks into empty years in either direction.
 *
 * A **calendar** month, which is an assumption worth naming: if DARPE closes
 * its books on some other day, every figure here shifts and this is the
 * function that would change. Nothing else encodes a period.
 *
 * There is no "outstanding" figure here on purpose: it would need what each
 * student is expected to pay and when, and DARPE has not settled that. A number
 * invented to fill the space would be worse than its absence.
 */
export async function getFinanceOverview(
  options: { monthStart?: string; now?: Date } = {}
): Promise<FinanceOverview> {
  const windows = dashboardWindows(options.now ?? new Date(), DEFAULT_TIMEZONE);
  const currentMonthStart = windows.monthStartDate;
  const monthStartDate = options.monthStart ?? currentMonthStart;

  const windowStart = shiftMonthStart(monthStartDate, -(MONTHS_SHOWN - 1));
  const nextMonth = shiftMonthStart(monthStartDate, 1);

  const [payments, span] = await Promise.all([
    db.payment.findMany({
      // Bounded at both ends now that the month can be any month: the chart
      // needs the five months before the selected one and nothing after it.
      where: {
        receivedOn: { gte: parseDateOnly(windowStart), lt: parseDateOnly(nextMonth) },
      },
      select: { amountCents: true, currency: true, method: true, receivedOn: true },
    }),
    // The whole history's outer edges, which is what bounds the pager. One
    // aggregate rather than loading payments nobody is going to show.
    db.payment.aggregate({ _min: { receivedOn: true }, _max: { receivedOn: true } }),
  ]);

  /** The first of the month a payment falls in, as YYYY-MM-DD. */
  const monthOf = (date: Date) => monthStartOf(formatDateOnly(date));

  const selectedMonth = payments.filter((p) => monthOf(p.receivedOn) === monthStartDate);
  const previousMonth = payments.filter(
    (p) => monthOf(p.receivedOn) === shiftMonthStart(monthStartDate, -1)
  );

  const methods = [...new Set(selectedMonth.map((p) => p.method))].sort();

  const monthly = monthsEndingAt(monthStartDate, MONTHS_SHOWN).map((monthStart) => ({
    monthStart,
    label: formatInZone(parseDateOnly(monthStart), "UTC", "MMM"),
    totals: totalByCurrency(payments.filter((p) => monthOf(p.receivedOn) === monthStart)),
  }));

  const nav = financeMonthNav({
    selected: monthStartDate,
    currentMonthStart,
    earliestMonthStart: span._min.receivedOn
      ? monthOf(span._min.receivedOn)
      : null,
    latestMonthStart: span._max.receivedOn ? monthOf(span._max.receivedOn) : null,
  });

  // Last day of the selected month, for the payments list's default range.
  const monthEndDate = formatDateOnly(
    new Date(parseDateOnly(nextMonth).getTime() - 86_400_000)
  );

  return {
    monthLabel: formatInZone(parseDateOnly(monthStartDate), "UTC", "MMMM yyyy"),
    monthNameLabel: formatInZone(parseDateOnly(monthStartDate), "UTC", "MMMM"),
    monthStartDate,
    monthEndDate,
    monthReceived: totalByCurrency(selectedMonth),
    previousMonthReceived: totalByCurrency(previousMonth),
    byMethod: methods.map((method) => ({
      method,
      totals: totalByCurrency(selectedMonth.filter((p) => p.method === method)),
    })),
    monthly,
    paymentCount: selectedMonth.length,
    previousMonthStart: nav.previous,
    nextMonthStart: nav.next,
    isCurrentMonth: monthStartDate === currentMonthStart,
  };
}

/** One completed class, as a line on a teacher's weekly pay. */
export type PayLine = {
  sessionId: string;
  /** "Mon 14", academy time. */
  dateLabel: string;
  startLabel: string;
  /** The group's name, or the student's. */
  title: string;
  type: ClassType;
  /** Students counted for the rate; 1 for an individual class. */
  students: number;
  minutes: number;
  hourlyCents: number;
  amountCents: number;
};

export type TeacherPayWeekRow = {
  teacherId: string;
  teacherName: string;
  lines: PayLine[];
  minutes: number;
  /** What the week's completed classes come to right now. */
  amountCents: number;
  /** The payout recorded for this week, if any. */
  payout: {
    id: string;
    amountCents: number;
    paidOn: string | null;
    method: PaymentMethod | null;
  } | null;
};

const PAY_SESSION_SELECT = {
  id: true,
  teacherId: true,
  startsAt: true,
  durationMinutes: true,
  type: true,
  group: { select: { name: true } },
  participants: {
    select: {
      attendance: true,
      student: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.ClassSessionSelect;

type PaySession = Prisma.ClassSessionGetPayload<{ select: typeof PAY_SESSION_SELECT }>;

function toPayLine(session: PaySession): PayLine {
  const students =
    session.type === "GROUP"
      ? session.participants.filter((participant) =>
          countsTowardsGroupSize(participant.attendance)
        ).length
      : 1;
  const firstStudent = session.participants[0]?.student;

  return {
    sessionId: session.id,
    dateLabel: formatInZone(session.startsAt, DEFAULT_TIMEZONE, "EEE d"),
    startLabel: formatInZone(session.startsAt, DEFAULT_TIMEZONE),
    title: session.group?.name ?? (firstStudent ? fullName(firstStudent) : "Class"),
    type: session.type,
    students,
    minutes: session.durationMinutes,
    hourlyCents: hourlyRateCents(session.type, students),
    amountCents: classPayCents({
      type: session.type,
      students,
      durationMinutes: session.durationMinutes,
    }),
  };
}

/** A pay week's boundaries as instants: Monday 00:00 to the next Monday, academy time. */
function payWeekRange(weekStart: string) {
  return {
    from: zonedToUtc(weekStart, "00:00", DEFAULT_TIMEZONE),
    to: zonedToUtc(addDaysToDate(weekStart, PAY_WEEK_DAYS), "00:00", DEFAULT_TIMEZONE),
  };
}

/**
 * Every teacher's pay for one week, class by class.
 *
 * Only completed classes count, at DARPE's rates (`teacher-pay.ts`). Active
 * teachers appear even with nothing to pay — a zero is how staff know the week
 * was checked — and so does an inactive teacher who still taught that week.
 */
export async function getTeacherPayWeek(weekStart: string): Promise<TeacherPayWeekRow[]> {
  const { from, to } = payWeekRange(weekStart);
  const taughtThatWeek = { status: "COMPLETED" as const, startsAt: { gte: from, lt: to } };

  const [teachers, sessions, payouts] = await Promise.all([
    db.teacher.findMany({
      where: { OR: [{ active: true }, { sessions: { some: taughtThatWeek } }] },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    db.classSession.findMany({
      where: taughtThatWeek,
      select: PAY_SESSION_SELECT,
      orderBy: { startsAt: "asc" },
    }),
    db.teacherPayout.findMany({
      where: {
        periodStart: parseDateOnly(weekStart),
        periodEnd: parseDateOnly(payWeekEnd(weekStart)),
      },
      select: { id: true, teacherId: true, amountCents: true, paidOn: true, method: true },
    }),
  ]);

  const linesByTeacher = new Map<string, PayLine[]>();
  for (const session of sessions) {
    const lines = linesByTeacher.get(session.teacherId) ?? [];
    lines.push(toPayLine(session));
    linesByTeacher.set(session.teacherId, lines);
  }

  const payoutByTeacher = new Map(payouts.map((payout) => [payout.teacherId, payout]));

  return teachers
    .map((teacher) => {
      const lines = linesByTeacher.get(teacher.id) ?? [];
      const payout = payoutByTeacher.get(teacher.id);

      return {
        teacherId: teacher.id,
        teacherName: fullName(teacher),
        lines,
        minutes: lines.reduce((total, line) => total + line.minutes, 0),
        amountCents: lines.reduce((total, line) => total + line.amountCents, 0),
        payout: payout
          ? {
              id: payout.id,
              amountCents: payout.amountCents,
              paidOn: payout.paidOn ? formatDateOnly(payout.paidOn) : null,
              method: payout.method,
            }
          : null,
      };
    })
    .sort(
      (a, b) =>
        Number(b.lines.length > 0) - Number(a.lines.length > 0) ||
        a.teacherName.localeCompare(b.teacherName)
    );
}

/** What one teacher's completed classes in a week come to — for recording a payout. */
export async function teacherWeekPayCents(teacherId: string, weekStart: string): Promise<number> {
  const { from, to } = payWeekRange(weekStart);

  const sessions = await db.classSession.findMany({
    where: { teacherId, status: "COMPLETED", startsAt: { gte: from, lt: to } },
    select: PAY_SESSION_SELECT,
  });

  return sessions.reduce((total, session) => total + toPayLine(session).amountCents, 0);
}

/** How far back "owed to teachers" looks for completed classes not yet paid. */
export const OWED_LOOKBACK_WEEKS = 12;

export type TeacherOwed = {
  teacherId: string;
  teacherName: string;
  amountCents: number;
  /** How many pay weeks the amount spans. */
  weeks: number;
};

/**
 * What is still owed to teachers: completed classes in weeks not yet paid.
 *
 * Worked out from the classes, the same way the pay screen does, rather than
 * from payouts somebody remembered to create — so a week nobody has opened
 * still counts. Bounded to the last twelve weeks.
 */
export async function getTeacherOwed(
  today: string
): Promise<{ totalCents: number; teachers: TeacherOwed[] }> {
  const since = shiftPayWeek(startOfWeekDate(today), -OWED_LOOKBACK_WEEKS);

  const [sessions, paid] = await Promise.all([
    db.classSession.findMany({
      where: {
        status: "COMPLETED",
        startsAt: { gte: zonedToUtc(since, "00:00", DEFAULT_TIMEZONE) },
      },
      select: {
        ...PAY_SESSION_SELECT,
        teacher: { select: { firstName: true, lastName: true } },
      },
    }),
    db.teacherPayout.findMany({
      where: { paidOn: { not: null }, periodStart: { gte: parseDateOnly(since) } },
      select: { teacherId: true, periodStart: true },
    }),
  ]);

  const settled = new Set(
    paid.map((payout) => `${payout.teacherId}|${formatDateOnly(payout.periodStart)}`)
  );

  const byTeacher = new Map<string, { name: string; amountCents: number; weeks: Set<string> }>();
  for (const session of sessions) {
    const week = startOfWeekDate(formatInZone(session.startsAt, DEFAULT_TIMEZONE, "yyyy-MM-dd"));
    if (settled.has(`${session.teacherId}|${week}`)) continue;

    const entry = byTeacher.get(session.teacherId) ?? {
      name: fullName(session.teacher),
      amountCents: 0,
      weeks: new Set<string>(),
    };
    entry.amountCents += toPayLine(session).amountCents;
    entry.weeks.add(week);
    byTeacher.set(session.teacherId, entry);
  }

  const teachers = [...byTeacher.entries()]
    .map(([teacherId, entry]) => ({
      teacherId,
      teacherName: entry.name,
      amountCents: entry.amountCents,
      weeks: entry.weeks.size,
    }))
    .sort((a, b) => b.amountCents - a.amountCents);

  return {
    totalCents: teachers.reduce((total, teacher) => total + teacher.amountCents, 0),
    teachers,
  };
}

export type StudentBillingRow = {
  id: string;
  name: string;
  languageName: string;
  teacherName: string | null;
  modality: Modality;
  planLabel: string;
  /** List price of their course. Not an amount owed — see `pricing.ts`. */
  priceCents: number;
  currency: Currency;
  status: StudentStatus;
  billing: BillingStatus;
  payMethod: PaymentMethod | null;
};

/**
 * Every studying student and what their course costs.
 *
 * There are no invoices here, and there will not be until DARPE says there
 * are: what a student pays is *inferred* from the plan they are on. Archived
 * students are left out — they are not on a course.
 *
 * Currency is a guess the app is honest about: DARPE charges students outside
 * Mexico in dollars, but nothing records where a student is, so everyone shows
 * the peso price until a payment in dollars proves otherwise.
 */
export async function getStudentBilling(): Promise<StudentBillingRow[]> {
  const prices = await getCoursePrices();
  const students = await db.student.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      modality: true,
      status: true,
      billing: true,
      payMethod: true,
      language: { select: { name: true } },
      primaryTeacher: { select: { firstName: true, lastName: true } },
      payments: {
        select: { currency: true },
        orderBy: { receivedOn: "desc" },
        take: 1,
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return students.map((student) => {
    const currency: Currency = student.payments[0]?.currency ?? "MXN";

    return {
      id: student.id,
      name: fullName(student),
      languageName: student.language.name,
      teacherName: student.primaryTeacher ? fullName(student.primaryTeacher) : null,
      modality: student.modality,
      planLabel: planLabel(student.modality),
      priceCents: coursePriceCents(student.modality, currency, prices),
      currency,
      status: student.status,
      billing: student.billing,
      payMethod: student.payMethod,
    };
  });
}

/** Students a payment can be recorded against. */
export async function getPayableStudents() {
  const students = await db.student.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return students.map((student) => ({ id: student.id, name: fullName(student) }));
}
