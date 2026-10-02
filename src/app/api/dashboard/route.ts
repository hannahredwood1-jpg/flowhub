import { route, requireUser } from "@/lib/rbac";
import { loadDashboard } from "@/lib/dashboard";

// GET /api/dashboard → the caller's own dashboard (members can never pass another id here)
export const GET = route(async () => {
  const user = await requireUser();
  return loadDashboard(user, user.id);
});
