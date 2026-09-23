-- Private notes, one owner each, with an optional checklist.
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "color" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "dueOn" DATE,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "note_items" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notes_ownerId_archived_idx" ON "notes"("ownerId", "archived");
CREATE INDEX "note_items_noteId_idx" ON "note_items"("noteId");

ALTER TABLE "notes" ADD CONSTRAINT "notes_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "note_items" ADD CONSTRAINT "note_items_noteId_fkey"
    FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same posture as every other table: no policies, so Supabase's own API roles
-- read nothing. The app reaches these through Prisma and scopes every query to
-- the signed-in profile in server code.
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "note_items" ENABLE ROW LEVEL SECURITY;

-- A payment is always counted in pesos. When a student paid in another
-- currency, what they handed over and the rate used are kept alongside.
ALTER TABLE "payments"
    ADD COLUMN "originalCurrency" VARCHAR(3),
    ADD COLUMN "originalAmountCents" INTEGER,
    ADD COLUMN "exchangeRateMicros" INTEGER;
