import {
  getPayableStudents,
  getStudentBilling,
  getTeacherPayWeek,
} from "@/features/finance/queries";
import {
  defaultPayWeekStart,
  paydayFor,
  payWeekEnd,
  selectedPayWeek,
  shiftPayWeek,
} from "@/features/finance/teacher-pay";
import { RecordPayment } from "@/features/finance/components/record-payment";
import { PayoutsPanel } from "@/features/finance/components/payouts-panel";
import { PayWeekPager } from "@/features/finance/components/pay-week-pager";
import { StudentBillingTable } from "@/features/finance/components/student-billing-table";
import { MigrationPending } from "@/features/finance/components/migration-pending";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { TabSwitch } from "@/components/shared/tab-switch";
import {
  DEFAULT_TIMEZONE,
  formatInZone,
  parseDateOnly,
  startOfWeekDate,
  todayInZone,
} from "@/lib/datetime";
import { isMissingTable } from "@/lib/db-errors";

/** A calendar date as text, without a timezone shift. */
function dateLabel(date: string, pattern: string): string {
  return formatInZone(parseDateOnly(date), "UTC", pattern);
}

function payWeekHref(weekStart: string): string {
  return `/payments?tab=payouts&week=${weekStart}`;
}

/**
 * Money in from students, money out to teachers — one tab each.
 *
 * Teacher pay goes a week at a time, because teachers are paid on Fridays: the
 * week shown is chosen by `?week=` and defaults to the one due this Friday.
 */
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const today = todayInZone(DEFAULT_TIMEZONE);
  const weekParam = Array.isArray(params.week) ? params.week[0] : params.week;
  const weekStart = selectedPayWeek(weekParam, today);
  const openTab = params.tab === "payouts" || weekParam ? "payouts" : "students";

  let students: Awaited<ReturnType<typeof getPayableStudents>>;
  let billing: Awaited<ReturnType<typeof getStudentBilling>>;
  let payWeek: Awaited<ReturnType<typeof getTeacherPayWeek>>;

  try {
    [students, billing, payWeek] = await Promise.all([
      getPayableStudents(),
      getStudentBilling(),
      getTeacherPayWeek(weekStart),
    ]);
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    return <MigrationPending title="Payments" />;
  }

  const unpaid = billing.filter(
    (row) => row.status === "ACTIVE" && row.billing === "PENDING"
  ).length;
  const toPay = payWeek.filter((row) => row.amountCents > 0 && !row.payout?.paidOn).length;

  const next = shiftPayWeek(weekStart, 1);
  const isDefaultWeek = weekStart === defaultPayWeekStart(today);

  return (
    <PageContainer>
      <PageHeader
        title="Payments"
        description="Money in from students · money out to teachers"
        actions={<RecordPayment students={students} defaultDate={today} />}
      />

      <TabSwitch
        label="Payments view"
        defaultTab={openTab}
        tabs={[
          {
            id: "students",
            label: "Students",
            count: unpaid || undefined,
            content: <StudentBillingTable rows={billing} />,
          },
          {
            id: "payouts",
            label: "Teacher pay",
            count: toPay || undefined,
            content: (
              <>
                <PayWeekPager
                  label={`${dateLabel(weekStart, "MMM d")} – ${dateLabel(payWeekEnd(weekStart), "MMM d, yyyy")}`}
                  sublabel={`Paid ${dateLabel(paydayFor(weekStart), "EEEE, MMM d")}`}
                  previousHref={payWeekHref(shiftPayWeek(weekStart, -1))}
                  nextHref={next <= startOfWeekDate(today) ? payWeekHref(next) : null}
                  defaultHref={isDefaultWeek ? null : "/payments?tab=payouts"}
                />
                <PayoutsPanel rows={payWeek} weekStart={weekStart} />
              </>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
