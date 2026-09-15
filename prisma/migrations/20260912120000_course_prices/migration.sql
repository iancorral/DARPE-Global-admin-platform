-- The list price of each course, editable from Settings.
--
-- One row per modality, created the first time staff change that price. The
-- application falls back to its published table for any modality without a
-- row, so nothing here has to exist for the app to run.
CREATE TABLE "course_prices" (
    "modality" "Modality" NOT NULL,
    "mxnCents" INTEGER NOT NULL,
    "usdCents" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_prices_pkey" PRIMARY KEY ("modality")
);

-- Same posture as every other table: no policies, so Supabase's own API roles
-- can read nothing. The application reaches it through Prisma, which bypasses
-- row security, and authorises in server code.
ALTER TABLE "course_prices" ENABLE ROW LEVEL SECURITY;
