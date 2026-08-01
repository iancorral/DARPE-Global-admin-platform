import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

const LANGUAGES = [
  { name: "English", code: "en" },
  { name: "Spanish", code: "es" },
  { name: "French", code: "fr" },
  { name: "Italian", code: "it" },
  { name: "German", code: "de" },
  { name: "Japanese", code: "ja" },
];

async function main() {
  for (const language of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: language.code },
      update: {},
      create: language,
    });
  }

  console.log(`Seeded ${LANGUAGES.length} languages`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });