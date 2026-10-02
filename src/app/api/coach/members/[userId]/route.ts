import { route, requireStaff, audit, HttpError } from "@/lib/rbac";
import { db } from "@/lib/db";
import { loadDashboard } from "@/lib/dashboard";

type Ctx = { params: Promise<{ userId: string }> };

// GET /api/coach/members/:userId → a trader's full plan + journal, read-only (Coach/Admin only, audited)
export const GET = route<Ctx>(async (_req, { params }) => {
  const { userId } = await params;
  const staff = await requireStaff();
  if (!(await db.user.findUnique({ where: { id: userId }, select: { id: true } }))) throw new HttpError(404, "Not found");
  await audit(staff.id, "VIEW_MEMBER", userId);
  return loadDashboard(staff, userId);
});
