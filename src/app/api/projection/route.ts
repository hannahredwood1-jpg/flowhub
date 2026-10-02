import { HttpError, route, requireUser } from "@/lib/rbac";
import { db } from "@/lib/db";
import { projectionInput } from "@/lib/validators";

// PUT /api/projection → save the caller's income projection (it becomes their trading plan)
export const PUT = route(async (req) => {
  const user = await requireUser();
  const { name, ...config } = projectionInput.parse(await req.json());
  const templates = await db.accountTemplate.count({ where: { id: { in: config.rows.map((r) => r.templateId) }, isActive: true } });
  if (templates !== new Set(config.rows.map((r) => r.templateId)).size) throw new HttpError(400, "Unknown account");
  await db.projection.upsert({ where: { userId: user.id }, create: { userId: user.id, name, config }, update: { name, config } });
  return { ok: true };
});

// DELETE /api/projection → clear it
export const DELETE = route(async () => {
  const user = await requireUser();
  await db.projection.deleteMany({ where: { userId: user.id } });
  return { ok: true };
});
