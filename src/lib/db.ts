import "server-only";
import { PrismaClient, Prisma } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
if (process.env.NODE_ENV !== "production") g.prisma = db;

/** Prisma Decimal | null → number | null for JSON/UI. */
export const num = (d: Prisma.Decimal | number | null | undefined) => (d == null ? null : Number(d));
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
