-- DARPE's register holds many students and teachers by first name alone, so a
-- surname can no longer be required. Dropping NOT NULL changes no existing row.
ALTER TABLE "students" ALTER COLUMN "lastName" DROP NOT NULL;
ALTER TABLE "teachers" ALTER COLUMN "lastName" DROP NOT NULL;
