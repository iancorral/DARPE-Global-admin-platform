-- When somebody last set their own password through the app.
--
-- Null means they are still on the password whoever created the account chose,
-- so the app can say so until they pick their own. Supabase Auth keeps the
-- password; this column only records that the change happened here.
ALTER TABLE "profiles" ADD COLUMN "passwordSetAt" TIMESTAMP(3);
