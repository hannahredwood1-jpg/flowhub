import { route, requireUser } from "@/lib/rbac";
import { loadCatalog } from "@/lib/dashboard";

// GET /api/catalog → firm → plan → size tree for the account dropdowns
export const GET = route(async () => {
  await requireUser();
  return loadCatalog();
});
