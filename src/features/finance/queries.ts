import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_TIMEZONE, formatDateOnly, formatInZone, parseDateOnly } from "@/lib/datetime";
import { dashboardWindows } from "@/features/dashboard/windows";
import { fullName } from "@/lib/names";
import { teachingLoad, totalByCurrency, type CurrencyTotal, type TeachingLoad } from "./money";
import { coursePriceCents, planLabel } from "./pricing";
import {
  financeMonthNav,
  monthStartOf,
  monthsEndingAt,
  shiftMonthStart,
} from "./months";
import { getCoursePrices } from "@/features/settings/queries";
import type {
  BillingStatus,
  Currency,
  Modality,
  PaymentMethod,
  StudentStatus,
} from "@/generated/prisma/client";

export type PaymentRow = {
  id: string;
  studentId: string;
  studentName: string;
  amountCents: number;
  currency: Currency;
  method: PaymentMethod;
  receivedOn: string;
  notes: string | null;
};

export type PayoutRow = {
  id: string;
  teacherId: string;
  teacherName: string;
  periodStart: string;
  periodEnd: string;
  amountCents: number;
  currency: Currency;
  paidOn: string | null;
  method: PaymentMethod | null;
  notes: string | null;
};

/**
 * The payments received in a period, newest first.
 *
 * Bounded: the screen shows a period, not the whole history, and a year of
 * payments is not something anyone reads down a page.
 */
export async function getPayments(from: Date, to: Date): Promise<PaymentRow[]> {
  const payments = await db.payment.findMany({
    where: { receivedOn: { gte: from, lte: to } },
    select: {
      id: true,
      studentId: true,
      amountCents: true,
      currency: true,
      method: true,
      receivedOn: true,
      notes: true,
      student: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ receivedOn: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return payments.map((payment) => ({
    id: payment.id,
    studentId: payment.studentId,
    studentName: fullName(payment.student),
    amountCents: payment.amountCents,
    currency: payment.currency,
    method: payment.method,
    receivedOn: formatDateOnly(payment.receivedOn),
    notes: payment.notes,
  }));
}

export type TeacherPeriod = {
  teacherId: string;
  teacherName: string;
  load: TeachingLoad;
  payout: PayoutRow | null;
};

/**
 * Every active teacher's period: what they taught, and whether they have been
 * settled for it.
 *
 * The hours are derived from completed classes rather than stored, so they can
 * never drift from the calendar. A teacher who taught nothing still appears —
 * seeing a zero is how staff know the period was checked and not forgotten.
 */
export async function getTeacherPeriods(
  periodStart: string,
  periodEnd: string
): Promise<TeacherPeriod[]> {
  // The period is a range of academy days; classes are absolute instants.
  const from = new Date(`${periodStart}T00:00:00Z`);
  const to = new Date(`${periodEnd}T23:59:59.999Z`);

  const [teachers, sessions, payouts] = await Promise.all([
    db.teacher.findMany({
      where: { active: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    db.classSession.findMany({
      where: { status: "COMPLETED", startsAt: { gte: from, lte: to } },
      select: { teacherId: true, durationMinutes: true, type: true },
    }),
    db.teacherPayout.findMany({
      where: {
        periodStart: parseDateOnly(periodStart),
        periodEnd: parseDateOnly(periodEnd),
      },
      select: {
        id: true,
        teacherId: true,
        periodStart: true,
        periodEnd: true,
        amountCents: true,
        currency: true,
        paidOn: true,
        method: true,
        notes: true,
        teacher: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const byTeacher = new Map<string, { durationMinutes: number; type: "INDIVIDUAL" | "GROUP" }[]>();
  for (const session of sessions) {
    const list = byTeacher.get(session.teacherId) ?? [];
    list.push({ durationMinutes: session.durationMinutes, type: session.type });
    byTeacher.set(session.teacherId, list);
  }

  const payoutByTeacher = new Map(payouts.map((payout) => [payout.teacherId, payout]));

  return teachers.map((teacher) => {
    const payout = payoutByTeacher.get(teacher.id);

    return {
      teacherId: teacher.id,
      teacherName: fullName(teacher),
      load: teachingLoad(byTeacher.get(teacher.id) ?? []),
      payout: payout
        ? {
            id: payout.id,
            teacherId: payout.teacherId,
            teacherName: fullName(payout.teacher),
            periodStart: formatDateOnly(payout.periodStart),
            periodEnd: formatDateOnly(payout.periodEnd),
            amountCents: payout.amountCents,
            currency: payout.currency,
            paidOn: payout.paidOn ? formatDateOnly(payout.paidOn) : null,
            method: payout.method,
            notes: payout.notes,
          }
        : null,
    };
  });
}

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
  /**
   * Payouts still owed, whatever period they belong to.
   *
   * Deliberately **not** scoped to the selected month: "still owed" is a fact
   * about now, and making it move with the pager would invent a figure for what
   * was owed in August, which nothing records.
   */
  unpaidPayouts: PayoutRow[];
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

  const [payments, unpaid, span] = await Promise.all([
    db.payment.findMany({
      // Bounded at both ends now that the month can be any month: the chart
      // needs the five months before the selected one and nothing after it.
      where: {
        receivedOn: { gte: parseDateOnly(windowStart), lt: parseDateOnly(nextMonth) },
      },
      select: { amountCents: true, currency: true, method: true, receivedOn: true },
    }),
    db.teacherPayout.findMany({
      where: { paidOn: null },
      select: {
        id: true,
        teacherId: true,
        periodStart: true,
        periodEnd: true,
        amountCents: true,
        currency: true,
        paidOn: true,
        method: true,
        notes: true,
        teacher: { select: { firstName: true, lastName: true } },
      },
      orderBy: { periodStart: "desc" },
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
    unpaidPayouts: unpaid.map((payout) => ({
      id: payout.id,
      teacherId: payout.teacherId,
      teacherName: fullName(payout.teacher),
      periodStart: formatDateOnly(payout.periodStart),
      periodEnd: formatDateOnly(payout.periodEnd),
      amountCents: payout.amountCents,
      currency: payout.currency,
      paidOn: null,
      method: payout.method,
      notes: payout.notes,
    })),
    previousMonthStart: nav.previous,
    nextMonthStart: nav.next,
    isCurrentMonth: monthStartDate === currentMonthStart,
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
