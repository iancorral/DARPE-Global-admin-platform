-- A note can be shared with the team and pointed at one person, the way
-- DARPE's tracking sheet has a "Responsable" column. Private stays the default.
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "shared" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "assigneeId" UUID;

ALTER TABLE "notes"
  DROP CONSTRAINT IF EXISTS "notes_assigneeId_fkey";
ALTER TABLE "notes"
  ADD CONSTRAINT "notes_assigneeId_fkey" FOREIGN KEY ("assigneeId")
  REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "notes_shared_archived_idx" ON "notes"("shared", "archived");
