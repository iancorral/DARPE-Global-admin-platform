import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

/** The seven languages DARPE teaches. */
const LANGUAGES = [
  { name: "Spanish", code: "es" },
  { name: "English", code: "en" },
  { name: "French", code: "fr" },
  { name: "Italian", code: "it" },
  { name: "German", code: "de" },
  { name: "Japanese", code: "ja" },
  { name: "Swedish", code: "sv" },
];

/*
 * Demo records, for filling a development database so the calendar, dashboard
 * and lists can be judged with something in them.
 *
 * Only created when `DARPE_SEED_DEMO=true`. Every one of them is invented, and
 * every address is on `demo.darpe.invalid` — a reserved TLD that can never
 * receive mail — which is also how they are found again and deleted. Real
 * records are never touched.
 */
const DEMO_DOMAIN = "demo.darpe.invalid";

const DEMO_TEACHERS = [
  { firstName: "Astrid", lastName: "Lindqvist", codes: ["sv", "en"] },
  { firstName: "Camille", lastName: "Dubois", codes: ["fr"] },
  { firstName: "Rosa", lastName: "Iglesias", codes: ["es", "it"] },
  { firstName: "Kenji", lastName: "Watanabe", codes: ["ja"] },
  { firstName: "Bruno", lastName: "Keller", codes: ["de", "en"] },
];

const DEMO_STUDENTS = [
  { firstName: "Lucía", lastName: "Ramos", code: "en", level: "B1", teacher: 4 },
  { firstName: "Diego", lastName: "Fuentes", code: "fr", level: "A2", teacher: 1 },
  { firstName: "Paulina", lastName: "Soto", code: "sv", level: "A1", teacher: 0 },
  { firstName: "Andrés", lastName: "Villalobos", code: "ja", level: "A2", teacher: 3 },
  { firstName: "Renata", lastName: "Cordero", code: "it", level: "B2", teacher: 2 },
  { firstName: "Tomás", lastName: "Aguirre", code: "de", level: "B1", teacher: 4 },
  { firstName: "Elena", lastName: "Márquez", code: "en", level: "C1", teacher: 4 },
  { firstName: "Joaquín", lastName: "Peña", code: "es", level: "A2", teacher: 2 },
];

function demoEmail(firstName: string, lastName: string): string {
  const slug = `${firstName}.${lastName}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  return `${slug}@${DEMO_DOMAIN}`;
}

async function seedLanguages() {
  for (const language of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: language.code },
      update: { name: language.name },
      create: language,
    });
  }

  console.log(`Languages ready: ${LANGUAGES.length}`);
}

async function seedDemoRecords() {
  const existing = await prisma.teacher.count({
    where: { email: { endsWith: DEMO_DOMAIN } },
  });

  if (existing > 0) {
    console.log("Demo records already present — nothing to do.");
    return;
  }

  const languages = await prisma.language.findMany({ select: { id: true, code: true } });
  const languageId = (code: string) => {
    const found = languages.find((language) => language.code === code);
    if (!found) throw new Error(`Language ${code} is missing; seed languages first.`);
    return found.id;
  };

  const teachers = [];
  for (const teacher of DEMO_TEACHERS) {
    teachers.push(
      await prisma.teacher.create({
        data: {
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          email: demoEmail(teacher.firstName, teacher.lastName),
          active: true,
          languages: {
            create: teacher.codes.map((code) => ({ languageId: languageId(code) })),
          },
        },
        select: { id: true },
      })
    );
  }

  /*
   * A spread of statuses so the filters and badges have something to show —
   * but the paused one is deliberately a second English student, never the
   * only speaker of a language.
   *
   * Generation skips students who are not active or trial, so making the sole
   * German student paused produced a database with German in it and no German
   * class anywhere: the calendar legend, which lists only the languages the
   * week actually contains, correctly had nothing to show for it.
   */
  const statuses = ["ACTIVE", "ACTIVE", "ACTIVE", "TRIAL", "ACTIVE", "ACTIVE", "PAUSED", "TRIAL"] as const;

  const students = [];
  for (const [index, student] of DEMO_STUDENTS.entries()) {
    students.push(
      await prisma.student.create({
        data: {
          firstName: student.firstName,
          lastName: student.lastName,
          email: demoEmail(student.firstName, student.lastName),
          languageId: languageId(student.code),
          primaryTeacherId: teachers[student.teacher]?.id ?? null,
          modality: "INDIVIDUAL_EXTENSIVE",
          status: statuses[index] ?? "ACTIVE",
          level: student.level,
          startedAt: new Date(),
        },
        select: { id: true, languageId: true },
      })
    );
  }

  /*
   * Recurring patterns rather than sessions: pressing "Generate month" in the
   * calendar then produces the classes through the real generation logic,
   * which is idempotent and conflict-checked. Writing ClassSession rows here
   * would bypass those rules and could collide with generation's uniqueness.
   */
  const today = new Date();
  const startsOn = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  let slots = 0;
  for (const [index, student] of students.entries()) {
    const source = DEMO_STUDENTS[index];
    if (!source) continue;

    const teacherId = teachers[source.teacher]?.id;
    if (!teacherId) continue;

    // Two classes a week each, on different days and times, so the week grid
    // fills without every class landing in the same column.
    for (const [offset, hour] of [
      [index % 5, 9 + (index % 4)],
      [(index + 2) % 5, 15 + (index % 3)],
    ]) {
      await prisma.scheduleSlot.create({
        data: {
          studentId: student.id,
          teacherId,
          weekday: 1 + (offset ?? 0),
          startTime: `${String(hour ?? 9).padStart(2, "0")}:00`,
          durationMinutes: 60,
          startsOn,
          active: true,
        },
      });
      slots += 1;
    }
  }

  console.log(
    `Demo records created: ${teachers.length} teachers, ${students.length} students, ${slots} weekly slots.\n` +
      `Open the calendar and press "Generate month" to turn the slots into classes.\n` +
      `To remove them later, delete every record whose email ends with @${DEMO_DOMAIN}.`
  );
}

async function main() {
  await seedLanguages();

  if (process.env.DARPE_SEED_DEMO === "true") {
    await seedDemoRecords();
  } else {
    console.log("DARPE_SEED_DEMO is not \"true\" — skipping demo records.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
