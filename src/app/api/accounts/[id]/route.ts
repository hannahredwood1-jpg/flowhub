import { route, requireUser, assertOwner, HttpError } from "@/lib/rbac";
import { db } from "@/lib/db";
import { accountPatch } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

async function ownAccount(id: string) {
  const user = await requireUser();
  const account = await db.memberAccount.findUnique({ where: { id } });
  if (!account) throw new HttpError(404, "Not found");
  assertOwner(user, account.userId);
  return account;
}

// PATCH /api/accounts/:id → stage change (passed/funded/failed), nickname, pass-plan inputs
export const PATCH = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  await ownAccount(id);
  const { startDate, ...data } = accountPatch.parse(await req.json());
  await db.memberAccount.update({ where: { id }, data: { ...data, ...(startDate ? { startDate: new Date(startDate) } : {}) } });
  return { ok: true };
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  await ownAccount(id);
  await db.memberAccount.delete({ where: { id } });
  return { ok: true };
});
