import { route, requireStaff, audit, HttpError } from "@/lib/rbac";
import { db } from "@/lib/db";
import { templatePatch } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/admin/catalog/:id → coach/admin updates a firm's rules when they change.
// Existing member accounts keep their purchase-time snapshot; new accounts get the new rules.
export const PATCH = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const staff = await requireStaff();
  const before = await db.accountTemplate.findUnique({ where: { id } });
  if (!before) throw new HttpError(404, "Not found");
  const data = templatePatch.parse(await req.json());
  await db.accountTemplate.update({
    where: { id },
    data: { ...data, updatedById: staff.id, lastVerifiedAt: new Date(), dataStatus: "OFFICIAL" },
  });
  await audit(staff.id, "CATALOG_UPDATE", id, { before, changes: data });
  return { ok: true };
});
