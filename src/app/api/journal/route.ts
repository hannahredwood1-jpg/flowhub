import { route, requireUser, HttpError } from "@/lib/rbac";
import { db } from "@/lib/db";
import { journalInput } from "@/lib/validators";

// POST /api/journal → log a trade (always written as the caller; userId is never taken from the body)
export const POST = route(async (req) => {
  const user = await requireUser();
  const { tradeDate, memberAccountId, ...data } = journalInput.parse(await req.json());
  if (memberAccountId) {
    const acct = await db.memberAccount.findFirst({ where: { id: memberAccountId, userId: user.id } });
    if (!acct) throw new HttpError(400, "Unknown account");
  }
  const entry = await db.journalEntry.create({
    data: { ...data, memberAccountId: memberAccountId ?? null, tradeDate: new Date(tradeDate), userId: user.id },
  });
  return { id: entry.id };
});
