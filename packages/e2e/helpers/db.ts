import { PrismaClient } from '@prisma/client';
import { E2E_DB_URL } from './constants.js';

let prisma: PrismaClient | null = null;

/** Get a shared PrismaClient connected to the E2E test database. */
export function getDb(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: { db: { url: E2E_DB_URL } },
    });
  }
  return prisma;
}

/** Disconnect the shared PrismaClient. Call in afterAll. */
export async function closeDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
