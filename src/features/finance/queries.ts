import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_TIMEZONE, formatDateOnly, formatInZone, parseDateOnly } from "@/lib/datetime";
import { dashboardWindows } from "@/features/dashboard/windows";
import { fullName } from "@/lib/names";
import { teachingLoad, totalByCurrency, type CurrencyTotal, type TeachingLoad } from "./money";
import type { Currency, PaymentMethod } from "@/generated/prisma/client";

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
  monthStartDate: string;
  monthEndDate: string;
  /** Received this academy month, per currency. */
  monthReceived: CurrencyTotal[];
  previousMonthReceived: CurrencyTotal[];
  /** By how the money arrived, this month. */
  byMethod: { method: PaymentMethod; totals: CurrencyTotal[] }[];
  /** The last six months, oldest first. */
  monthly: { monthStart: string; label: string; totals: CurrencyTotal[] }[];
  paymentCount: number;
  /** Payouts still owed, whatever period they belong to. */
  unpaidPayouts: PayoutRow[];
};

/** First day of the month `back` months before a YYYY-MM-DD date. */
function shiftMonth(monthStartDate: string, back: number): string {
  const year = Number(monthStartDate.slice(0, 4));
  const month = Number(monthStartDate.slice(5, 7));
  const zeroBased = year * 12 + (month - 1) - back;

  return `${Math.floor(zeroBased / 12)}-${String((zeroBased % 12) + 1).padStart(2, "0")}-01`;
}

const MONTHS_SHOWN = 6;

/**
 * Everything the finance screen shows, all of it money actually received.
 *
 * There is no "outstanding" figure here on purpose: it would need what each
 * student is expected to pay and when, and DARPE has not settled that. A number
 * invented to fill the space would be worse than its absence.
 */
export async function getFinanceOverview(now: Date = new Date()): Promise<FinanceOverview> {
  const windows = dashboardWindows(now, DEFAULT_TIMEZONE);
  const monthStartDate = windows.monthStartDate;
  const earliest = shiftMonth(monthStartDate, MONTHS_SHOWN - 1);

  const [payments, unpaid] = await Promise.all([
    db.payment.findMany({
      where: { receivedOn: { gte: parseDateOnly(earliest) } },
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
  ]);

  /** The first of the month a payment falls in, as YYYY-MM-DD. */
  const monthOf = (date: Date) => `${formatDateOnly(date).slice(0, 7)}-01`;

  const thisMonth = payments.filter((p) => monthOf(p.receivedOn) === monthStartDate);
  const previousMonth = payments.filter(
    (p) => monthOf(p.receivedOn) === shiftMonth(monthStartDate, 1)
  );

  const methods = [...new Set(thisMonth.map((p) => p.method))].sort();

  const monthly = Array.from({ length: MONTHS_SHOWN }, (_, index) => {
    const monthStart = shiftMonth(monthStartDate, MONTHS_SHOWN - 1 - index);

    return {
      monthStart,
      label: formatInZone(parseDateOnly(monthStart), "UTC", "MMM"),
      totals: totalByCurrency(payments.filter((p) => monthOf(p.receivedOn) === monthStart)),
    };
  });

  // Last day of the month, for the payments list's default range.
  const monthEndDate = formatDateOnly(new Date(windows.nextMonthStart.getTime() - 86_400_000));

  return {
    monthLabel: formatInZone(windows.monthStart, DEFAULT_TIMEZONE, "MMMM yyyy"),
    monthStartDate,
    monthEndDate,
    monthReceived: totalByCurrency(thisMonth),
    previousMonthReceived: totalByCurrency(previousMonth),
    byMethod: methods.map((method) => ({
      method,
      totals: totalByCurrency(thisMonth.filter((p) => p.method === method)),
    })),
    monthly,
    paymentCount: thisMonth.length,
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
  };
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
