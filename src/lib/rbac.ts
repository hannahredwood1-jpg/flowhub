import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { User } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "./db";
import { syncRolesIfStale } from "./discord";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const isStaff = (u: Pick<User, "role">) => u.role === "COACH" || u.role === "ADMIN";

/**
 * The single source of truth for "who is calling". The JWT only proves identity;
 * the role is always read from the DB, and re-synced from Discord when older than 10 min.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;
  const synced = await syncRolesIfStale(user);
  return synced.isGuildMember ? synced : null;
}

// ── Pages (server components) ────────────────────────────────
export async function requireUserPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export async function requireStaffPage() {
  const user = await requireUserPage();
  if (!isStaff(user)) redirect("/dashboard");
  return user;
}

// ── API routes ───────────────────────────────────────────────
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Sign in with Discord");
  return user;
}

export async function requireStaff() {
  const user = await requireUser();
  if (!isStaff(user)) throw new HttpError(403, "Coach or Admin role required");
  return user;
}

/** Members may only touch their own rows; staff may read anyone's. */
export function assertCanRead(viewer: User, ownerId: string) {
  if (viewer.id !== ownerId && !isStaff(viewer)) throw new HttpError(404, "Not found"); // 404, not 403: don't confirm the row exists
}
export function assertOwner(viewer: User, ownerId: string) {
  if (viewer.id !== ownerId) throw new HttpError(404, "Not found");
}

export async function audit(actorId: string, action: string, targetId?: string, meta?: object) {
  await db.auditLog.create({ data: { actorId, action, targetId, meta: meta as object | undefined } });
}

/**
 * Wraps a route handler: same-origin check on writes (CSRF), error → JSON mapping.
 */
export function route<C = unknown>(handler: (req: Request, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        const origin = req.headers.get("origin");
        const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
        if (!origin || new URL(origin).host !== host) throw new HttpError(403, "Cross-origin request blocked");
      }
      const result = await handler(req, ctx);
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: "Invalid input", issues: e.flatten() }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  };
}
