import { getFinanceOverview, getPayableStudents, getPayments, getTeacherPeriods } from "@/features/finance/queries";
import { RecordPayment } from "@/features/finance/components/record-payment";
import { PayoutsPanel } from "@/features/finance/components/payouts-panel";
import { formatAmount, PAYMENT_METHOD_LABELS } from "@/features/finance/money";
import { EmptyState } from "@/components/shared/empty-state";
import { InitialsAvatar } from "@/components/shared/identity";
import { PageContainer, PageHeader, Section } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { MigrationPending } from "@/features/finance/components/migration-pending";
import { DEFAULT_TIMEZONE, todayInZone } from "@/lib/datetime";
import { isMissingTable } from "@/lib/db-errors";

export default async function PaymentsPage() {
  const today = todayInZone(DEFAULT_TIMEZONE);

  let overview: Awaited<ReturnType<typeof getFinanceOverview>>;
  let payments: Awaited<ReturnType<typeof getPayments>>;
  let students: Awaited<ReturnType<typeof getPayableStudents>>;
  let periods: Awaited<ReturnType<typeof getTeacherPeriods>>;

  try {
    overview = await getFinanceOverview();
    [payments, students, periods] = await Promise.all([
      getPayments(
        new Date(`${overview.monthStartDate}T00:00:00Z`),
        new Date(`${overview.monthEndDate}T00:00:00Z`)
      ),
      getPayableStudents(),
      // The academy month is the settlement period until DARPE settles on
      // fortnights or something else.
      getTeacherPeriods(overview.monthStartDate, overview.monthEndDate),
    ]);
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    return <MigrationPending title="Payments" />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Payments"
        description={`Money in from students, money out to teachers · ${overview.monthLabel}`}
      />

      <div className="space-y-8">
        <Section
          title="Payments received"
          description={`${payments.length} this month`}
          actions={<RecordPayment students={students} defaultDate={today} />}
        >
          {payments.length === 0 ? (
            <EmptyState>
              No payments recorded this month. Record one as the money arrives — that is
              what the revenue figures are built from.
            </EmptyState>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
              {payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <InitialsAvatar name={payment.studentName} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {payment.studentName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {payment.receivedOn}
                      {payment.notes ? ` · ${payment.notes}` : ""}
                    </span>
                  </span>
                  <Badge variant="secondary">
                    {PAYMENT_METHOD_LABELS[payment.method]}
                  </Badge>
                  <span className="text-sm font-medium tabular-nums">
                    {formatAmount(payment.amountCents, payment.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Teacher payouts"
          description="Hours come from completed classes; the amount is entered by hand"
        >
          {periods.length === 0 ? (
            <EmptyState>No active teachers yet.</EmptyState>
          ) : (
            <PayoutsPanel
              periods={periods}
              periodStart={overview.monthStartDate}
              periodEnd={overview.monthEndDate}
              today={today}
            />
          )}
        </Section>
      </div>
    </PageContainer>
  );
}
