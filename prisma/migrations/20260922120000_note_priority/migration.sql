-- A note can be marked urgent or important, the way DARPE's tracking sheet
-- has an "Importancia" column. Null means an ordinary note.
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "priority" TEXT;
