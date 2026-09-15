-- Student status gains a billing dimension, and loses the trial state.
--
-- DARPE tracks two independent things about a student that were previously
-- being asked of one field: whether they are still studying, and how their
-- place is paid for. An active student is also paid, pending or on one of the
-- academy's arrangements, so the two live side by side.

-- 1. How the place is paid for, in DARPE's own vocabulary.
CREATE TYPE "BillingStatus" AS ENUM (
  'PAID',
  'PENDING',
  'RESERVED',
  'BENEFIT',
  'COLLABORATION'
);

ALTER TABLE "students"
  ADD COLUMN "billing" "BillingStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "pausedAt" TIMESTAMP(3);

-- Students already paused have no recorded pause date. Backdating them to now
-- starts their month from today rather than inventing a past they never had:
-- the archive rule then gives staff a full month to review them.
UPDATE "students" SET "pausedAt" = NOW() WHERE "status" = 'PAUSED';

CREATE INDEX "students_billing_idx" ON "students"("billing");

-- 2. Drop TRIAL. DARPE gives no trial classes — someone who wants to try one
-- books an advisory, which is an ordinary paid class. Postgres cannot remove a
-- value from an enum, so the type is rebuilt.
ALTER TABLE "students" ALTER COLUMN "status" DROP DEFAULT;

CREATE TYPE "StudentStatus_new" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

ALTER TABLE "students"
  ALTER COLUMN "status" TYPE "StudentStatus_new"
  USING ("status"::text::"StudentStatus_new");

DROP TYPE "StudentStatus";
ALTER TYPE "StudentStatus_new" RENAME TO "StudentStatus";

ALTER TABLE "students" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
