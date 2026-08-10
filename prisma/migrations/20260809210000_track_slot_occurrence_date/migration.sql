-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN "slotOccurrenceOn" DATE;

-- Backfill generated sessions with the local calendar date they were generated for
UPDATE "class_sessions"
SET "slotOccurrenceOn" = ("startsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chihuahua')::date
WHERE "scheduleSlotId" IS NOT NULL AND "slotOccurrenceOn" IS NULL;

-- Uniqueness now follows the slot occurrence, not the (editable) start time
DROP INDEX IF EXISTS "class_sessions_scheduleSlotId_startsAt_key";

CREATE UNIQUE INDEX "class_sessions_scheduleSlotId_slotOccurrenceOn_key"
  ON "class_sessions"("scheduleSlotId", "slotOccurrenceOn");
