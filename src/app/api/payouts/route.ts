import { route, requireUser, HttpError } from "@/lib/rbac";
import { db } from "@/lib/db";
import { payoutInput } from "@/lib/validators";

export const POST = route(async (req) => {
  const user = await requireUser();
  const { memberAccountId, amount, paidAt } = payoutInput.parse(await req.json());
  if (!(await db.memberAccount.findFirst({ where: { id: memberAccountId, userId: user.id } }))) throw new HttpError(400, "Unknown account");
  await db.payout.create({ data: { userId: user.id, memberAccountId, amount, paidAt: new Date(paidAt) } });
  return { ok: true };
});
