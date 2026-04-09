import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const login = process.env.SEED_USER_LOGIN ?? "admin";
const password = process.env.SEED_USER_PASSWORD ?? "admin12345";

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { login },
    update: {
      passwordHash,
    },
    create: {
      login,
      passwordHash,
    },
  });

  console.log("Seed user is ready:");
  console.log(`login: ${login}`);
  console.log(`password: ${password}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed database.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
