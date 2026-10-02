import { route, requireStaff, audit, HttpError } from "@/lib/rbac";
import { db } from "@/lib/db";
import { feedbackInput } from "@/lib/validators";

// POST /api/coach/feedback → note on a trade, an account plan, or general (Coach/Admin only)
export const POST = route(async (req) => {
  const staff = await requireStaff();
  const input = feedbackInput.parse(await req.json());
  // The trade/account referenced must belong to the trader named — no cross-linking other members' rows
  if (input.journalEntryId && !(await db.journalEntry.findFirst({ where: { id: input.journalEntryId, userId: input.traderId } })))
    throw new HttpError(400, "Trade doesn't belong to this trader");
  if (input.memberAccountId && !(await db.memberAccount.findFirst({ where: { id: input.memberAccountId, userId: input.traderId } })))
    throw new HttpError(400, "Account doesn't belong to this trader");
  const fb = await db.coachFeedback.create({ data: { ...input, coachId: staff.id } });
  await audit(staff.id, "FEEDBACK_CREATE", input.traderId, { feedbackId: fb.id });
  return { id: fb.id };
});
