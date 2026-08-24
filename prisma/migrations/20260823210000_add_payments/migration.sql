-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'STRIPE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('MXN', 'USD');

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'MXN',
    "method" "PaymentMethod" NOT NULL,
    "receivedOn" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_payouts" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'MXN',
    "paidOn" DATE,
    "method" "PaymentMethod",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_receivedOn_idx" ON "payments"("receivedOn");

-- CreateIndex
CREATE INDEX "payments_studentId_idx" ON "payments"("studentId");

-- CreateIndex
CREATE INDEX "teacher_payouts_paidOn_idx" ON "teacher_payouts"("paidOn");

-- One settlement per teacher per period, so re-settling edits rather than
-- quietly creating a second record for the same fortnight.
CREATE UNIQUE INDEX "teacher_payouts_teacherId_periodStart_periodEnd_key" ON "teacher_payouts"("teacherId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_payouts" ADD CONSTRAINT "teacher_payouts_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- An amount is never negative, and a period never runs backwards. Both are
-- cheap to state here and impossible to violate from any client.
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive" CHECK ("amountCents" > 0);
ALTER TABLE "teacher_payouts" ADD CONSTRAINT "teacher_payouts_amount_positive" CHECK ("amountCents" >= 0);
ALTER TABLE "teacher_payouts" ADD CONSTRAINT "teacher_payouts_period_ordered" CHECK ("periodStart" <= "periodEnd");
