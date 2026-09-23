-- A third role for the people who run the academy day to day.
--
-- On its own because Postgres cannot use a new enum value in the transaction
-- that adds it; nothing here uses STAFF yet.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STAFF';
