import { route, requireUser, assertOwner, HttpError } from "@/lib/rbac";
import { db } from "@/lib/db";
import { journalPatch } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

async function ownEntry(id: string) {
  const user = await requireUser();
  const entry = await db.journalEntry.findUnique({ where: { id } });
  if (!entry) throw new HttpError(404, "Not found");
  assertOwner(user, entry.userId); // coaches can read journals but never edit them
  return { user, entry };
}

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const { user } = await ownEntry(id);
  const { tradeDate, memberAccountId, ...data } = journalPatch.parse(await req.json());
  if (memberAccountId && !(await db.memberAccount.findFirst({ where: { id: memberAccountId, userId: user.id } })))
    throw new HttpError(400, "Unknown account");
  await db.journalEntry.update({
    where: { id },
    data: { ...data, ...(memberAccountId !== undefined ? { memberAccountId } : {}), ...(tradeDate ? { tradeDate: new Date(tradeDate) } : {}) },
  });
  return { ok: true };
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  await ownEntry(id);
  await db.journalEntry.delete({ where: { id } });
  return { ok: true };
});
