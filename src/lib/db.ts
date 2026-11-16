import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Serverless note (Vercel): the bundled filesystem is read-only, so the seeded
 * SQLite file is copied into /tmp once per warm instance and DATABASE_URL is
 * pointed there. On normal hosts (sandbox/VM/self-hosted) the existing
 * DATABASE_URL is used unchanged.
 */
function resolveDatabaseUrl(): string | undefined {
  if (!process.env.VERCEL) return process.env.DATABASE_URL;
  const tmpPath = "/tmp/gaminos.db";
  try {
    if (!fs.existsSync(tmpPath)) {
      const src = path.join(process.cwd(), "db", "custom.db");
      fs.copyFileSync(src, tmpPath);
    }
    return `file:${tmpPath}`;
  } catch {
    return process.env.DATABASE_URL;
  }
}

process.env.DATABASE_URL = resolveDatabaseUrl() ?? process.env.DATABASE_URL;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    //
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
