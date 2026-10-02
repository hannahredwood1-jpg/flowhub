import { route, requireStaff } from "@/lib/rbac";
import { loadDirectory } from "@/lib/dashboard";
import { sortDirectory, type DirectorySort } from "@/lib/viewmodel";

// GET /api/coach/members?q=&sort=drawdown|recent|consistency  (Coach/Admin only)
export const GET = route(async (req) => {
  const staff = await requireStaff();
  const url = new URL(req.url);
  const sort = (["drawdown", "recent", "consistency"].includes(url.searchParams.get("sort") ?? "") ? url.searchParams.get("sort") : "drawdown") as DirectorySort;
  const q = url.searchParams.get("q")?.slice(0, 50) || undefined;
  return sortDirectory(await loadDirectory(staff, q), sort);
});
