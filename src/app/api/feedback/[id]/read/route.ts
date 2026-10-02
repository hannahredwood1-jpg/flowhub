import { route, requireUser, assertOwner, HttpError } from "@/lib/rbac";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/feedback/:id/read → trader marks a coach note as read
export const POST = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  const fb = await db.coachFeedback.findUnique({ where: { id } });
  if (!fb) throw new HttpError(404, "Not found");
  assertOwner(user, fb.traderId);
  await db.coachFeedback.update({ where: { id }, data: { readAt: new Date() } });
  return { ok: true };
});
