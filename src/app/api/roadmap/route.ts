import { route, requireUser } from "@/lib/rbac";
import { db } from "@/lib/db";
import { roadmapSchema } from "@/lib/validators";

// PUT /api/roadmap → create/update the caller's income goal + strategy metrics
export const PUT = route(async (req) => {
  const user = await requireUser();
  const data = roadmapSchema.parse(await req.json());
  await db.roadmap.upsert({ where: { userId: user.id }, create: { ...data, userId: user.id }, update: data });
  return { ok: true };
});
