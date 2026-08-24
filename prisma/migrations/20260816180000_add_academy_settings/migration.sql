-- CreateTable
CREATE TABLE "academy_settings" (
    "id" TEXT NOT NULL DEFAULT 'academy',
    "dayStartHour" INTEGER NOT NULL DEFAULT 8,
    "dayEndHour" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_settings_pkey" PRIMARY KEY ("id")
);
