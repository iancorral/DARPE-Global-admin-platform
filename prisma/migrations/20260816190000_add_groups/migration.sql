-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("groupId","studentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE INDEX "groups_teacherId_idx" ON "groups"("teacherId");

-- CreateIndex
CREATE INDEX "groups_languageId_idx" ON "groups"("languageId");

-- CreateIndex
CREATE INDEX "groups_active_idx" ON "groups"("active");

-- CreateIndex
CREATE INDEX "group_members_studentId_idx" ON "group_members"("studentId");

-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "groupId" TEXT;

-- AlterTable: a recurring pattern now belongs to a student or to a group.
-- Existing rows are all individual, so dropping NOT NULL is safe and changes
-- nothing about them.
ALTER TABLE "schedule_slots" ALTER COLUMN "studentId" DROP NOT NULL;
ALTER TABLE "schedule_slots" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE INDEX "schedule_slots_groupId_idx" ON "schedule_slots"("groupId");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A pattern is for exactly one audience: a student or a group, never both and
-- never neither. Prisma cannot express this, so the database enforces it —
-- which is the only place it cannot be bypassed.
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_one_audience"
    CHECK (("studentId" IS NOT NULL) <> ("groupId" IS NOT NULL));
