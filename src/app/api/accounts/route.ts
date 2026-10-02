import { route, requireUser, HttpError } from "@/lib/rbac";
import { db } from "@/lib/db";
import { accountInput } from "@/lib/validators";
import { snapshotRules } from "@/lib/dashboard";

// POST /api/accounts → add an exact prop firm account from the catalog to the caller's roadmap
export const POST = route(async (req) => {
  const user = await requireUser();
  const input = accountInput.parse(await req.json());
  const template = await db.accountTemplate.findFirst({ where: { id: input.templateId, isActive: true }, include: { firm: true } });
  if (!template) throw new HttpError(400, "Unknown account");
  const { templateId, startDate, ...rest } = input;
  const account = await db.memberAccount.create({
    data: { ...rest, templateId, userId: user.id, startDate: new Date(startDate), ruleSnapshot: snapshotRules(template) },
  });
  return { id: account.id };
});
