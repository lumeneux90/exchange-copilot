import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.EXCHANGE_STORAGE_DATABASE_URL;

if (!connectionString) {
  throw new Error("EXCHANGE_STORAGE_DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
