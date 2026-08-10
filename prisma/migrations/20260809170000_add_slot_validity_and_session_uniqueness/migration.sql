-- AlterTable
ALTER TABLE "schedule_slots" ADD COLUMN "startsOn" DATE;
ALTER TABLE "schedule_slots" ADD COLUMN "endsOn" DATE;

-- Backfill existing slots so they are valid from the day they were created
UPDATE "schedule_slots" SET "startsOn" = "createdAt"::date WHERE "startsOn" IS NULL;

ALTER TABLE "schedule_slots" ALTER COLUMN "startsOn" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "class_sessions_scheduleSlotId_startsAt_key" ON "class_sessions"("scheduleSlotId", "startsAt");
