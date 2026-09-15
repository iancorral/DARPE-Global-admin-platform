import {
  getFinanceOverview,
  getPayableStudents,
  getStudentBilling,
  getTeacherPeriods,
} from "@/features/finance/queries";
import { RecordPayment } from "@/features/finance/components/record-payment";
import { PayoutsPanel } from "@/features/finance/components/payouts-panel";
import { StudentBillingTable } from "@/features/finance/components/student-billing-table";
import { MigrationPending } from "@/features/finance/components/migration-pending";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer, PageHeader } from "@/components/shared/page";
import { TabSwitch } from "@/components/shared/tab-switch";
import { DEFAULT_TIMEZONE, todayInZone } from "@/lib/datetime";
import { isMissingTable } from "@/lib/db-errors";

/**
 * Money in from students, money out to teachers — one list each.
 *
 * Deliberately not a ledger of individual payments: what a student pays is
 * inferred from the plan they are on, so the useful view is "who is on what and
 * have they paid", not a receipt per transaction. Recording an actual payment
 * is still here as an action; the history of them lives on the finance screen.
 */
export default async function PaymentsPage() {
  const today = todayInZone(DEFAULT_TIMEZONE);

  let overview: Awaited<ReturnType<typeof getFinanceOverview>>;
  let students: Awaited<ReturnType<typeof getPayableStudents>>;
  let billing: Awaited<ReturnType<typeof getStudentBilling>>;
  let periods: Awaited<ReturnType<typeof getTeacherPeriods>>;

  try {
    overview = await getFinanceOverview();
    [students, billing, periods] = await Promise.all([
      getPayableStudents(),
      getStudentBilling(),
      // The academy month is the settlement period until DARPE settles on
      // fortnights or something else.
      getTeacherPeriods(overview.monthStartDate, overview.monthEndDate),
    ]);
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    return <MigrationPending title="Payments" />;
  }

  const unpaid = billing.filter(
    (row) => row.status === "ACTIVE" && row.billing === "PENDING"
  ).length;
  const owedCount = periods.filter((period) => period.payout && !period.payout.paidOn).length;

  return (
    <PageContainer>
      <PageHeader
        title="Payments"
        description={`Money in from students · money out to teachers · ${overview.monthLabel}`}
        actions={<RecordPayment students={students} defaultDate={today} />}
      />

      <TabSwitch
        label="Payments view"
        tabs={[
          {
            id: "students",
            label: "Students",
            count: unpaid || undefined,
            content: <StudentBillingTable rows={billing} />,
          },
          {
            id: "payouts",
            label: "Teacher payouts",
            count: owedCount || undefined,
            content:
              periods.length === 0 ? (
                <EmptyState>No active teachers yet.</EmptyState>
              ) : (
                <PayoutsPanel
                  periods={periods}
                  periodStart={overview.monthStartDate}
                  periodEnd={overview.monthEndDate}
                  periodLabel={overview.monthLabel}
                  today={today}
                />
              ),
          },
        ]}
      />
    </PageContainer>
  );
}
