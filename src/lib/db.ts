import { PrismaClient } from "@prisma/client";

// Standard Next.js singleton pattern: without this, hot-reload in dev would
// create a new PrismaClient (and new DB connection pool) on every file
// change, quickly exhausting Postgres connections.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
